import type { PerformanceSeedRow } from "@/lib/connectors/meta";
import type { Ga4DimensionType, Ga4MetricKey } from "@/lib/supabase/types";
import { throwIfAuthStatus } from "@/lib/connectors/errors";

type Ga4ReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

function formatLabel(date: string) {
  const normalized =
    date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
  return new Date(`${normalized}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function normalizePropertyId(propertyId: string) {
  const trimmed = propertyId.trim();
  if (trimmed.startsWith("properties/")) {
    return trimmed.replace("properties/", "");
  }
  return trimmed;
}

export async function fetchGa4DailyPerformance(
  accessToken: string,
  propertyId: string,
): Promise<PerformanceSeedRow[] | null> {
  const property = normalizePropertyId(propertyId);
  if (!property) {
    return null;
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: "30daysAgo", endDate: "yesterday" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      limit: 100,
    }),
  });

  if (!response.ok) {
    throwIfAuthStatus("ga4", response.status);
    const errorText = await response.text();
    console.error("GA4 runReport failed", response.status, errorText);
    return null;
  }

  const payload = (await response.json()) as { rows?: Ga4ReportRow[] };
  if (!payload.rows?.length) {
    return null;
  }

  return payload.rows
    .map((row) => {
      const rawDate = row.dimensionValues?.[0]?.value;
      if (!rawDate) return null;

      const date =
        rawDate.length === 8
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate;
      const sessions = Number(row.metricValues?.[0]?.value ?? 0);

      return {
        date,
        label: formatLabel(date),
        meta: 0,
        google_ads: 0,
        tiktok: 0,
        linkedin: 0,
        ga4: sessions,
        search_console: 0,
        conversions: 0,
      };
    })
    .filter((row): row is PerformanceSeedRow => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// --- Rich GA4 metrics (curated set + dimension breakdowns) ---

export type Ga4DailyMetricRow = { date: string } & Record<Ga4MetricKey, number>;

export type Ga4BreakdownRow = {
  date: string;
  dimension_type: Ga4DimensionType;
  dimension_value: string;
  sessions: number;
  total_users: number;
  engaged_sessions: number;
  key_events: number;
  screen_page_views: number;
};

export type Ga4MetricsResult = {
  daily: Ga4DailyMetricRow[];
  breakdowns: Ga4BreakdownRow[];
};

// GA4 metric API name -> our column key. Split into batches of <=10 (API limit).
const DAILY_METRIC_BATCHES: Array<Record<string, Ga4MetricKey>> = [
  {
    totalUsers: "total_users",
    newUsers: "new_users",
    activeUsers: "active_users",
    sessions: "sessions",
    engagedSessions: "engaged_sessions",
    engagementRate: "engagement_rate",
    averageSessionDuration: "average_session_duration",
    userEngagementDuration: "user_engagement_duration",
    sessionsPerUser: "sessions_per_user",
  },
  {
    screenPageViews: "screen_page_views",
    screenPageViewsPerSession: "views_per_session",
    eventCount: "event_count",
    keyEvents: "key_events",
    bounceRate: "bounce_rate",
    totalRevenue: "total_revenue",
    transactions: "transactions",
    purchaseRevenue: "purchase_revenue",
  },
];

const BREAKDOWN_DIMENSIONS: Array<{ type: Ga4DimensionType; apiName: string; perDate: boolean }> = [
  { type: "channel_group", apiName: "sessionDefaultChannelGroup", perDate: true },
  { type: "device", apiName: "deviceCategory", perDate: true },
  { type: "country", apiName: "country", perDate: true },
  { type: "landing_page", apiName: "landingPagePlusQueryString", perDate: false },
];

const BREAKDOWN_METRICS: Record<string, keyof Omit<Ga4BreakdownRow, "date" | "dimension_type" | "dimension_value">> = {
  sessions: "sessions",
  totalUsers: "total_users",
  engagedSessions: "engaged_sessions",
  keyEvents: "key_events",
  screenPageViews: "screen_page_views",
};

function normalizeDate(raw: string) {
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
}

type RunReportBody = {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  orderBys?: Array<Record<string, unknown>>;
  limit?: number;
};

/**
 * Runs a GA4 runReport. If the request fails and it requested `keyEvents`,
 * retries once with the legacy `conversions` metric (older properties), mapping
 * the result back so callers always see keyEvents.
 */
async function runGa4Report(
  accessToken: string,
  property: string,
  body: RunReportBody,
): Promise<Ga4ReportRow[] | null> {
  const send = async (b: RunReportBody) => {
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(b),
      },
    );
    return response;
  };

  let response = await send(body);

  if (!response.ok && body.metrics.some((m) => m.name === "keyEvents")) {
    const fallback: RunReportBody = {
      ...body,
      metrics: body.metrics.map((m) => (m.name === "keyEvents" ? { name: "conversions" } : m)),
    };
    response = await send(fallback);
  }

  if (!response.ok) {
    throwIfAuthStatus("ga4", response.status);
    console.error("GA4 runReport failed", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as { rows?: Ga4ReportRow[] };
  return payload.rows ?? [];
}

function emptyMetricRecord(): Record<Ga4MetricKey, number> {
  const record = {} as Record<Ga4MetricKey, number>;
  for (const batch of DAILY_METRIC_BATCHES) {
    for (const key of Object.values(batch)) {
      record[key] = 0;
    }
  }
  return record;
}

export async function fetchGa4Metrics(
  accessToken: string,
  propertyId: string,
): Promise<Ga4MetricsResult | null> {
  const property = normalizePropertyId(propertyId);
  if (!property) {
    return null;
  }

  const dateRanges = [{ startDate: "30daysAgo", endDate: "yesterday" }];
  const byDate = new Map<string, Record<Ga4MetricKey, number>>();

  // Curated daily metrics, batched to respect the 10-metric-per-request limit.
  for (const batch of DAILY_METRIC_BATCHES) {
    const metricNames = Object.keys(batch);
    const rows = await runGa4Report(accessToken, property, {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: metricNames.map((name) => ({ name })),
      limit: 100,
    });
    if (!rows) continue;

    for (const row of rows) {
      const rawDate = row.dimensionValues?.[0]?.value;
      if (!rawDate) continue;
      const date = normalizeDate(rawDate);
      const record = byDate.get(date) ?? emptyMetricRecord();
      metricNames.forEach((apiName, index) => {
        const column = batch[apiName];
        record[column] = Number(row.metricValues?.[index]?.value ?? 0);
      });
      byDate.set(date, record);
    }
  }

  const daily: Ga4DailyMetricRow[] = [...byDate.entries()]
    .map(([date, metrics]) => ({ date, ...metrics }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Dimension breakdowns. Each is isolated so one bad dimension never aborts the sync.
  const breakdownMetricNames = Object.keys(BREAKDOWN_METRICS);
  const maxDate = daily.at(-1)?.date ?? normalizeDate(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  const breakdowns: Ga4BreakdownRow[] = [];

  for (const dim of BREAKDOWN_DIMENSIONS) {
    try {
      const dimensions = dim.perDate ? [{ name: "date" }, { name: dim.apiName }] : [{ name: dim.apiName }];
      const rows = await runGa4Report(accessToken, property, {
        dateRanges,
        dimensions,
        metrics: breakdownMetricNames.map((name) => ({ name })),
        orderBys: dim.perDate ? undefined : [{ metric: { metricName: "sessions" }, desc: true }],
        limit: dim.perDate ? 100000 : 25,
      });
      if (!rows?.length) continue;

      for (const row of rows) {
        const dimValues = row.dimensionValues ?? [];
        const date = dim.perDate ? normalizeDate(dimValues[0]?.value ?? maxDate) : maxDate;
        const dimensionValue = (dim.perDate ? dimValues[1]?.value : dimValues[0]?.value) ?? "(not set)";

        const entry: Ga4BreakdownRow = {
          date,
          dimension_type: dim.type,
          dimension_value: dimensionValue,
          sessions: 0,
          total_users: 0,
          engaged_sessions: 0,
          key_events: 0,
          screen_page_views: 0,
        };
        breakdownMetricNames.forEach((apiName, index) => {
          entry[BREAKDOWN_METRICS[apiName]] = Number(row.metricValues?.[index]?.value ?? 0);
        });
        breakdowns.push(entry);
      }
    } catch (error) {
      console.error(`GA4 breakdown ${dim.type} failed`, error);
    }
  }

  if (!daily.length && !breakdowns.length) {
    return null;
  }

  return { daily, breakdowns };
}

export async function listGa4Properties(accessToken: string) {
  const response = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    accountSummaries?: Array<{
      displayName?: string;
      propertySummaries?: Array<{ property?: string; displayName?: string }>;
    }>;
  };

  const accounts: Array<{ id: string; name: string }> = [];

  for (const account of payload.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      if (!property.property) continue;
      const id = property.property.replace("properties/", "");
      accounts.push({
        id,
        name: property.displayName ?? `${account.displayName ?? "GA4"} · ${id}`,
      });
    }
  }

  return accounts;
}
