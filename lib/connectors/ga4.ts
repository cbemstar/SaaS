import type { PerformanceSeedRow } from "@/lib/connectors/meta";

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
