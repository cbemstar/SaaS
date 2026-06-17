import type { PerformanceSeedRow } from "@/lib/connectors/meta";
import type { SourceMetricsResult } from "@/lib/metrics/catalog";
import { throwIfAuthStatus } from "@/lib/connectors/errors";

type GoogleAdsRow = {
  segments?: { date?: string; device?: string };
  campaign?: { name?: string };
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
    conversions?: number;
    conversionsValue?: number;
  };
};

function formatLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

export async function fetchGoogleAdsDailyPerformance(
  accessToken: string,
  customerId: string,
  developerToken: string,
): Promise<PerformanceSeedRow[] | null> {
  const query = `
    SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
    FROM customer
    WHERE segments.date DURING LAST_30_DAYS
  `;

  const response = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throwIfAuthStatus("google_ads", response.status);
    return null;
  }

  const payload = (await response.json()) as Array<{ results?: GoogleAdsRow[] }>;
  const rows = payload.flatMap((chunk) => chunk.results ?? []);
  if (!rows.length) {
    return null;
  }

  return rows
    .filter((row) => row.segments?.date)
    .map((row) => ({
      date: row.segments!.date!,
      label: formatLabel(row.segments!.date!),
      meta: 0,
      google_ads: Number(row.metrics?.costMicros ?? 0) / 1_000_000,
      tiktok: 0,
      linkedin: 0,
      ga4: 0,
      search_console: 0,
      conversions: Number(row.metrics?.conversions ?? 0),
    }));
}

/**
 * Rich Google Ads metrics for the generic store: daily cost/impressions/clicks/
 * conversions/value, plus per-date campaign and device breakdowns (filterable).
 */
export async function fetchGoogleAdsMetrics(
  accessToken: string,
  customerId: string,
  developerToken: string,
): Promise<SourceMetricsResult | null> {
  const endpoint = `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`;

  const run = async (query: string): Promise<GoogleAdsRow[]> => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      throwIfAuthStatus("google_ads", res.status);
      console.error("Google Ads query failed", res.status, await res.text());
      return [];
    }
    const payload = (await res.json()) as Array<{ results?: GoogleAdsRow[] }>;
    return payload.flatMap((chunk) => chunk.results ?? []);
  };

  const core = (row: GoogleAdsRow) => ({
    cost: Number(row.metrics?.costMicros ?? 0) / 1_000_000,
    impressions: Number(row.metrics?.impressions ?? 0),
    clicks: Number(row.metrics?.clicks ?? 0),
    conversions: Number(row.metrics?.conversions ?? 0),
  });

  const dailyRows = await run(
    `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM customer WHERE segments.date DURING LAST_30_DAYS`,
  );
  const daily = dailyRows
    .filter((row) => row.segments?.date)
    .map((row) => ({
      date: row.segments!.date!,
      metrics: { ...core(row), conversions_value: Number(row.metrics?.conversionsValue ?? 0) },
    }));

  const breakdowns: SourceMetricsResult["breakdowns"] = [];

  const campaignRows = await run(
    `SELECT segments.date, campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS`,
  );
  for (const row of campaignRows) {
    if (!row.segments?.date) continue;
    breakdowns.push({
      date: row.segments.date,
      dimension_type: "campaign",
      dimension_value: row.campaign?.name ?? "(unknown)",
      metrics: core(row),
    });
  }

  const deviceRows = await run(
    `SELECT segments.date, segments.device, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM customer WHERE segments.date DURING LAST_30_DAYS`,
  );
  for (const row of deviceRows) {
    if (!row.segments?.date) continue;
    breakdowns.push({
      date: row.segments.date,
      dimension_type: "device",
      dimension_value: row.segments.device ?? "UNKNOWN",
      metrics: core(row),
    });
  }

  if (!daily.length && !breakdowns.length) return null;
  return { daily, breakdowns };
}
