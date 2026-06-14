import type { PerformanceSeedRow } from "@/lib/connectors/meta";

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
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
