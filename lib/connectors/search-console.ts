import type { PerformanceSeedRow } from "@/lib/connectors/meta";
import type { SourceMetricsResult } from "@/lib/metrics/catalog";
import { throwIfAuthStatus } from "@/lib/connectors/errors";

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

function formatLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function formatDateRange() {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);

  const toIso = (value: Date) => value.toISOString().slice(0, 10);
  return { startDate: toIso(start), endDate: toIso(end) };
}

export function normalizeSearchConsoleSiteUrl(siteUrl: string) {
  const trimmed = siteUrl.trim();
  if (trimmed.startsWith("sc-domain:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, "")}/`;
}

export async function fetchSearchConsoleDailyPerformance(
  accessToken: string,
  siteUrl: string,
): Promise<PerformanceSeedRow[] | null> {
  const site = normalizeSearchConsoleSiteUrl(siteUrl);
  const { startDate, endDate } = formatDateRange();
  const encodedSite = encodeURIComponent(site);

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 1000,
      }),
    },
  );

  if (!response.ok) {
    throwIfAuthStatus("search_console", response.status);
    const errorText = await response.text();
    console.error("Search Console query failed", response.status, errorText);
    return null;
  }

  const payload = (await response.json()) as { rows?: GscRow[] };
  if (!payload.rows?.length) {
    return null;
  }

  return payload.rows
    .map((row) => {
      const date = row.keys?.[0];
      if (!date) return null;

      return {
        date,
        label: formatLabel(date),
        meta: 0,
        google_ads: 0,
        tiktok: 0,
        linkedin: 0,
        ga4: 0,
        search_console: Number(row.clicks ?? 0),
        conversions: 0,
      };
    })
    .filter((row): row is PerformanceSeedRow => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Rich Search Console metrics for the generic store: daily clicks/impressions
 * (+ impression-weighted position for correct averaging), per-date country/device
 * breakdowns (filterable), and top queries/pages (display only).
 */
export async function fetchSearchConsoleMetrics(
  accessToken: string,
  siteUrl: string,
): Promise<SourceMetricsResult | null> {
  const site = normalizeSearchConsoleSiteUrl(siteUrl);
  const { startDate, endDate } = formatDateRange();
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;

  const run = async (body: Record<string, unknown>): Promise<GscRow[]> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, ...body }),
    });
    if (!res.ok) {
      throwIfAuthStatus("search_console", res.status);
      console.error("Search Console query failed", res.status, await res.text());
      return [];
    }
    return ((await res.json()) as { rows?: GscRow[] }).rows ?? [];
  };

  const dailyRows = await run({ dimensions: ["date"], rowLimit: 1000 });
  const daily = dailyRows
    .filter((row) => row.keys?.[0])
    .map((row) => {
      const impressions = Number(row.impressions ?? 0);
      return {
        date: row.keys![0],
        metrics: {
          clicks: Number(row.clicks ?? 0),
          impressions,
          position_weight: Number(row.position ?? 0) * impressions,
        },
      };
    });

  const maxDate = daily.at(-1)?.date ?? endDate;
  const breakdowns: SourceMetricsResult["breakdowns"] = [];

  for (const dim of ["country", "device"] as const) {
    const rows = await run({ dimensions: ["date", dim], rowLimit: 25000 });
    for (const row of rows) {
      const date = row.keys?.[0];
      const value = row.keys?.[1];
      if (!date || value == null) continue;
      breakdowns.push({
        date,
        dimension_type: dim,
        dimension_value: value,
        metrics: { clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0) },
      });
    }
  }

  for (const dim of ["query", "page"] as const) {
    const rows = await run({ dimensions: [dim], rowLimit: 25 });
    for (const row of rows) {
      const value = row.keys?.[0];
      if (value == null) continue;
      breakdowns.push({
        date: maxDate,
        dimension_type: dim,
        dimension_value: value,
        metrics: { clicks: Number(row.clicks ?? 0), impressions: Number(row.impressions ?? 0) },
      });
    }
  }

  if (!daily.length && !breakdowns.length) return null;
  return { daily, breakdowns };
}

export async function listSearchConsoleSites(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
  };

  return (payload.siteEntry ?? [])
    .filter((site) => site.siteUrl && site.permissionLevel && site.permissionLevel !== "siteUnverifiedUser")
    .map((site) => ({
      id: site.siteUrl!,
      name: site.siteUrl!,
    }));
}
