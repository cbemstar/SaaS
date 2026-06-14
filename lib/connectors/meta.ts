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
