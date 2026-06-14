import type { PerformanceSeedRow } from "@/lib/connectors/meta";

type GoogleAdsRow = {
  segments?: { date?: string };
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
    conversions?: number;
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
