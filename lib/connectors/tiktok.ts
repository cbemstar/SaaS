import type { SourceMetricsResult } from "@/lib/metrics/catalog";
import { throwIfAuthStatus } from "@/lib/connectors/errors";

// Best-effort TikTok Business API integration. NOT yet validated against a live
// advertiser — verify metric/dimension names and the response shape when a real
// TikTok Ads account is connected.

type TtRow = { dimensions?: Record<string, string>; metrics?: Record<string, string> };

function dateWindow(days: number) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { start: f(start), end: f(end) };
}

function core(m?: Record<string, string>) {
  return {
    spend: Number(m?.spend ?? 0),
    impressions: Number(m?.impressions ?? 0),
    clicks: Number(m?.clicks ?? 0),
    conversions: Number(m?.conversions ?? 0),
    video_views: Number(m?.video_play_actions ?? 0),
  };
}

async function report(
  accessToken: string,
  advertiserId: string,
  dataLevel: string,
  dimensions: string[],
): Promise<TtRow[]> {
  const { start, end } = dateWindow(30);
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: dataLevel,
    dimensions: JSON.stringify(dimensions),
    metrics: JSON.stringify(["spend", "impressions", "clicks", "conversions", "video_play_actions"]),
    start_date: start,
    end_date: end,
    page_size: "1000",
  });
  const res = await fetch(
    `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`,
    { headers: { "Access-Token": accessToken } },
  );
  if (!res.ok) {
    throwIfAuthStatus("tiktok", res.status);
    console.error("TikTok report failed", res.status, await res.text());
    return [];
  }
  const payload = (await res.json()) as { data?: { list?: TtRow[] } };
  return payload.data?.list ?? [];
}

export async function fetchTikTokMetrics(accessToken: string, advertiserId: string): Promise<SourceMetricsResult | null> {
  const daily = (await report(accessToken, advertiserId, "AUCTION_ADVERTISER", ["stat_time_day"]))
    .map((r) => ({ date: (r.dimensions?.stat_time_day ?? "").slice(0, 10), metrics: core(r.metrics) }))
    .filter((d) => d.date);

  const breakdowns: SourceMetricsResult["breakdowns"] = [];
  for (const r of await report(accessToken, advertiserId, "AUCTION_CAMPAIGN", ["campaign_id", "stat_time_day"])) {
    const date = (r.dimensions?.stat_time_day ?? "").slice(0, 10);
    if (!date) continue;
    breakdowns.push({
      date,
      dimension_type: "campaign",
      dimension_value: r.dimensions?.campaign_name ?? r.dimensions?.campaign_id ?? "(campaign)",
      metrics: core(r.metrics),
    });
  }

  if (!daily.length && !breakdowns.length) return null;
  return { daily, breakdowns };
}
