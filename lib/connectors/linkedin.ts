import type { SourceMetricsResult } from "@/lib/metrics/catalog";

// Best-effort LinkedIn Marketing adAnalytics integration. NOT yet validated
// against a live LinkedIn Ads account — verify field names and the restli
// dateRange/accounts encoding when a real account is connected.

const LINKEDIN_VERSION = "202405";

type LiElement = {
  impressions?: number;
  clicks?: number;
  costInLocalCurrency?: string;
  externalWebsiteConversions?: number;
  dateRange?: { start?: { year: number; month: number; day: number } };
  pivotValues?: string[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateRangeParam(days: number) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d: Date) => `(year:${d.getFullYear()},month:${d.getMonth() + 1},day:${d.getDate()})`;
  return `(start:${fmt(start)},end:${fmt(end)})`;
}

function isoDate(range?: LiElement["dateRange"]): string | null {
  const s = range?.start;
  return s ? `${s.year}-${pad(s.month)}-${pad(s.day)}` : null;
}

function core(e: LiElement) {
  return {
    spend: Number(e.costInLocalCurrency ?? 0),
    impressions: Number(e.impressions ?? 0),
    clicks: Number(e.clicks ?? 0),
    conversions: Number(e.externalWebsiteConversions ?? 0),
  };
}

async function query(accessToken: string, accountId: string, pivot: string): Promise<LiElement[]> {
  const account = `urn:li:sponsoredAccount:${accountId.replace(/\D/g, "")}`;
  const params = new URLSearchParams({
    q: "analytics",
    pivot,
    timeGranularity: "DAILY",
    dateRange: dateRangeParam(30),
    accounts: `List(${encodeURIComponent(account)})`,
    fields: "impressions,clicks,costInLocalCurrency,externalWebsiteConversions,dateRange,pivotValues",
  });
  const res = await fetch(`https://api.linkedin.com/rest/adAnalytics?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });
  if (!res.ok) {
    console.error("LinkedIn adAnalytics failed", res.status, await res.text());
    return [];
  }
  return ((await res.json()) as { elements?: LiElement[] }).elements ?? [];
}

export async function fetchLinkedInMetrics(accessToken: string, accountId: string): Promise<SourceMetricsResult | null> {
  const daily: SourceMetricsResult["daily"] = [];
  for (const e of await query(accessToken, accountId, "ACCOUNT")) {
    const date = isoDate(e.dateRange);
    if (!date) continue;
    daily.push({ date, metrics: core(e) });
  }

  const breakdowns: SourceMetricsResult["breakdowns"] = [];
  for (const e of await query(accessToken, accountId, "CAMPAIGN")) {
    const date = isoDate(e.dateRange);
    if (!date) continue;
    breakdowns.push({
      date,
      dimension_type: "campaign",
      dimension_value: e.pivotValues?.[0] ?? "(campaign)",
      metrics: core(e),
    });
  }

  if (!daily.length && !breakdowns.length) return null;
  return { daily, breakdowns };
}
