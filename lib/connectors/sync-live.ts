import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import type { Database } from "@/lib/supabase/types";
import { fetchGa4DailyPerformance, fetchGa4Metrics } from "@/lib/connectors/ga4";
import { additiveKeys, type MetricSource, type SourceMetricsResult } from "@/lib/metrics/catalog";
import { writeBreakdowns, writeDailyMetrics } from "@/lib/metrics/store";
import { fetchGoogleAdsDailyPerformance, fetchGoogleAdsMetrics } from "@/lib/connectors/google-ads";
import { getGoogleAccessToken } from "@/lib/connectors/google-auth";
import { fetchMetaDailyPerformance, type PerformanceSeedRow } from "@/lib/connectors/meta";
import { fetchSearchConsoleDailyPerformance, fetchSearchConsoleMetrics } from "@/lib/connectors/search-console";

type AdminClient = SupabaseClient<Database>;

function mergePerformanceRows(rows: PerformanceSeedRow[]): PerformanceSeedRow[] {
  const byDate = new Map<string, PerformanceSeedRow>();

  for (const row of rows) {
    const existing = byDate.get(row.date);
    if (!existing) {
      byDate.set(row.date, { ...row });
      continue;
    }

    byDate.set(row.date, {
      date: row.date,
      label: row.label,
      meta: existing.meta + row.meta,
      google_ads: existing.google_ads + row.google_ads,
      tiktok: existing.tiktok + row.tiktok,
      linkedin: existing.linkedin + row.linkedin,
      ga4: existing.ga4 + row.ga4,
      search_console: existing.search_console + row.search_console,
      conversions: existing.conversions + row.conversions,
    });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function pullLivePerformanceForClient(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  channels: ChannelKey[],
): Promise<PerformanceSeedRow[] | null> {
  const { data: links } = await admin
    .from("client_connector_links")
    .select("channel, external_account_id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId);

  const linkByChannel = new Map((links ?? []).map((link) => [link.channel, link.external_account_id]));
  const liveRows: PerformanceSeedRow[] = [];

  for (const channel of channels) {
    if (channel === "meta") {
      const accessToken = (
        await admin
          .from("connector_tokens")
          .select("access_token")
          .eq("workspace_id", workspaceId)
          .eq("channel", "meta")
          .maybeSingle()
      ).data?.access_token;
      const accountId = linkByChannel.get("meta");
      if (!accessToken || !accountId) continue;
      const rows = await fetchMetaDailyPerformance(accessToken, accountId);
      if (rows) liveRows.push(...rows);
    }

    if (channel === "google_ads") {
      const accessToken = await getGoogleAccessToken(admin, workspaceId, "google_ads");
      const customerId = linkByChannel.get("google_ads");
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      if (!accessToken || !customerId || !developerToken) continue;
      const rows = await fetchGoogleAdsDailyPerformance(accessToken, customerId, developerToken);
      if (rows) liveRows.push(...rows);
    }

    if (channel === "ga4") {
      const accessToken = await getGoogleAccessToken(admin, workspaceId, "ga4");
      const propertyId = linkByChannel.get("ga4");
      if (!accessToken || !propertyId) continue;
      const rows = await fetchGa4DailyPerformance(accessToken, propertyId);
      if (rows) liveRows.push(...rows);
    }

    if (channel === "search_console") {
      const accessToken = await getGoogleAccessToken(admin, workspaceId, "search_console");
      const siteUrl = linkByChannel.get("search_console");
      if (!accessToken || !siteUrl) continue;
      const rows = await fetchSearchConsoleDailyPerformance(accessToken, siteUrl);
      if (rows) liveRows.push(...rows);
    }
  }

  return liveRows.length ? mergePerformanceRows(liveRows) : null;
}

async function getClientLink(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  channel: ChannelKey,
): Promise<string | null> {
  const { data } = await admin
    .from("client_connector_links")
    .select("external_account_id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("channel", channel)
    .maybeSingle();
  return data?.external_account_id ?? null;
}

/** Writes a connector's rich result to the generic store (additive metrics only; rates derive on read). */
async function writeSourceResult(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  source: MetricSource,
  result: SourceMetricsResult | null,
): Promise<number> {
  if (!result) return 0;
  const adds = new Set(additiveKeys(source));
  await writeDailyMetrics(
    admin,
    workspaceId,
    clientId,
    source,
    result.daily.map((day) => ({
      date: day.date,
      metrics: Object.fromEntries(Object.entries(day.metrics).filter(([key]) => adds.has(key))),
    })),
  );
  await writeBreakdowns(admin, workspaceId, clientId, source, result.breakdowns);
  return result.daily.length;
}

export async function syncGa4MetricsForClient(admin: AdminClient, workspaceId: string, clientId: string) {
  const propertyId = await getClientLink(admin, workspaceId, clientId, "ga4");
  if (!propertyId) return 0;
  const accessToken = await getGoogleAccessToken(admin, workspaceId, "ga4");
  if (!accessToken) return 0;
  const result = await fetchGa4Metrics(accessToken, propertyId);
  if (!result) return 0;

  const adapted: SourceMetricsResult = {
    daily: result.daily.map((day) => ({ date: day.date, metrics: day as unknown as Record<string, number> })),
    breakdowns: result.breakdowns.map((b) => ({
      date: b.date,
      dimension_type: b.dimension_type,
      dimension_value: b.dimension_value,
      metrics: {
        sessions: b.sessions,
        total_users: b.total_users,
        engaged_sessions: b.engaged_sessions,
        key_events: b.key_events,
        screen_page_views: b.screen_page_views,
      },
    })),
  };
  return writeSourceResult(admin, workspaceId, clientId, "ga4", adapted);
}

export async function syncSearchConsoleMetricsForClient(admin: AdminClient, workspaceId: string, clientId: string) {
  const siteUrl = await getClientLink(admin, workspaceId, clientId, "search_console");
  if (!siteUrl) return 0;
  const accessToken = await getGoogleAccessToken(admin, workspaceId, "search_console");
  if (!accessToken) return 0;
  return writeSourceResult(
    admin,
    workspaceId,
    clientId,
    "search_console",
    await fetchSearchConsoleMetrics(accessToken, siteUrl),
  );
}

export async function syncGoogleAdsMetricsForClient(admin: AdminClient, workspaceId: string, clientId: string) {
  const customerId = await getClientLink(admin, workspaceId, clientId, "google_ads");
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!customerId || !developerToken) return 0;
  const accessToken = await getGoogleAccessToken(admin, workspaceId, "google_ads");
  if (!accessToken) return 0;
  return writeSourceResult(
    admin,
    workspaceId,
    clientId,
    "google_ads",
    await fetchGoogleAdsMetrics(accessToken, customerId, developerToken),
  );
}

/** Pulls rich metrics into the generic store for every supported channel a client has. */
export async function syncRichMetricsForClient(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  channels: ChannelKey[],
) {
  const jobs: Array<Promise<unknown>> = [];
  if (channels.includes("ga4"))
    jobs.push(syncGa4MetricsForClient(admin, workspaceId, clientId).catch((e) => console.error("GA4 sync failed", e)));
  if (channels.includes("search_console"))
    jobs.push(
      syncSearchConsoleMetricsForClient(admin, workspaceId, clientId).catch((e) =>
        console.error("Search Console sync failed", e),
      ),
    );
  if (channels.includes("google_ads"))
    jobs.push(
      syncGoogleAdsMetricsForClient(admin, workspaceId, clientId).catch((e) =>
        console.error("Google Ads sync failed", e),
      ),
    );
  await Promise.all(jobs);
}
