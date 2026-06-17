import { throwIfAuthStatus } from "@/lib/connectors/errors";

type PerformanceSeedRow = {
  date: string;
  label: string;
  meta: number;
  google_ads: number;
  tiktok: number;
  linkedin: number;
  ga4: number;
  search_console: number;
  conversions: number;
};

type MetaInsightRow = {
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
};

function formatLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

export async function fetchMetaDailyPerformance(
  accessToken: string,
  adAccountId: string,
): Promise<PerformanceSeedRow[] | null> {
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const params = new URLSearchParams({
    fields: "spend,impressions,clicks,actions",
    time_increment: "1",
    level: "account",
    date_preset: "last_30d",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.facebook.com/v20.0/${accountId}/insights?${params.toString()}`);
  if (!response.ok) {
    throwIfAuthStatus("meta", response.status);
    return null;
  }

  const payload = (await response.json()) as { data?: MetaInsightRow[] };
  if (!payload.data?.length) {
    return null;
  }

  return payload.data.map((row) => {
    const spend = Number(row.spend ?? 0);
    const conversions =
      row.actions?.find((action) => action.action_type === "purchase" || action.action_type === "lead")?.value ?? "0";

    return {
      date: row.date_start,
      label: formatLabel(row.date_start),
      meta: spend,
      google_ads: 0,
      tiktok: 0,
      linkedin: 0,
      ga4: 0,
      search_console: 0,
      conversions: Number(conversions),
    };
  });
}

export type { PerformanceSeedRow };

// --- Rich Meta metrics for the generic store ---------------------------------

import type { SourceMetricsResult } from "@/lib/metrics/catalog";

const CONVERSION_ACTIONS = new Set([
  "purchase",
  "lead",
  "complete_registration",
  "offsite_conversion.fb_pixel_purchase",
  "offsite_conversion.fb_pixel_lead",
]);

type MetaRichRow = MetaInsightRow & {
  reach?: string;
  campaign_name?: string;
  impression_device?: string;
};

function conversionsFromActions(actions?: Array<{ action_type: string; value: string }>) {
  return (actions ?? [])
    .filter((a) => CONVERSION_ACTIONS.has(a.action_type))
    .reduce((sum, a) => sum + Number(a.value ?? 0), 0);
}

function metaCore(row: MetaRichRow) {
  return {
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions: conversionsFromActions(row.actions),
  };
}

async function metaInsights(
  accountId: string,
  accessToken: string,
  extra: Record<string, string>,
): Promise<MetaRichRow[]> {
  const params = new URLSearchParams({
    time_increment: "1",
    date_preset: "last_30d",
    access_token: accessToken,
    limit: "500",
    ...extra,
  });
  const rows: MetaRichRow[] = [];
  let url: string | null = `https://graph.facebook.com/v20.0/${accountId}/insights?${params.toString()}`;
  for (let page = 0; url && page < 10; page++) {
    const res: Response = await fetch(url);
    if (!res.ok) {
      throwIfAuthStatus("meta", res.status);
      console.error("Meta insights failed", res.status, await res.text());
      break;
    }
    const payload = (await res.json()) as { data?: MetaRichRow[]; paging?: { next?: string } };
    rows.push(...(payload.data ?? []));
    url = payload.paging?.next ?? null;
  }
  return rows;
}

export async function fetchMetaMetrics(accessToken: string, adAccountId: string): Promise<SourceMetricsResult | null> {
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const dailyRows = await metaInsights(accountId, accessToken, {
    fields: "spend,impressions,clicks,reach,actions",
    level: "account",
  });
  const daily = dailyRows
    .filter((row) => row.date_start)
    .map((row) => ({ date: row.date_start, metrics: { ...metaCore(row), reach: Number(row.reach ?? 0) } }));

  const breakdowns: SourceMetricsResult["breakdowns"] = [];

  const campaignRows = await metaInsights(accountId, accessToken, {
    fields: "spend,impressions,clicks,actions,campaign_name",
    level: "campaign",
  });
  for (const row of campaignRows) {
    if (!row.date_start) continue;
    breakdowns.push({
      date: row.date_start,
      dimension_type: "campaign",
      dimension_value: row.campaign_name ?? "(unknown)",
      metrics: metaCore(row),
    });
  }

  const deviceRows = await metaInsights(accountId, accessToken, {
    fields: "spend,impressions,clicks,actions",
    level: "account",
    breakdowns: "impression_device",
  });
  for (const row of deviceRows) {
    if (!row.date_start) continue;
    breakdowns.push({
      date: row.date_start,
      dimension_type: "device",
      dimension_value: row.impression_device ?? "unknown",
      metrics: metaCore(row),
    });
  }

  if (!daily.length && !breakdowns.length) return null;
  return { daily, breakdowns };
}
