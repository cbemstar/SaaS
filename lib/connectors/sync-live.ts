import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import type { Database } from "@/lib/supabase/types";
import { fetchGa4DailyPerformance, fetchGa4Metrics } from "@/lib/connectors/ga4";
import { fetchGoogleAdsDailyPerformance } from "@/lib/connectors/google-ads";
import { getGoogleAccessToken } from "@/lib/connectors/google-auth";
import { fetchMetaDailyPerformance, type PerformanceSeedRow } from "@/lib/connectors/meta";
import { fetchSearchConsoleDailyPerformance } from "@/lib/connectors/search-console";

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

/**
 * Pulls the curated GA4 metric set + dimension breakdowns for a client and
 * stores them in ga4_daily_metrics / ga4_breakdowns. Runs independently of the
 * legacy channel-spend pipeline. Returns the number of daily rows written.
 */
export async function syncGa4MetricsForClient(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
): Promise<number> {
  const { data: link } = await admin
    .from("client_connector_links")
    .select("external_account_id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("channel", "ga4")
    .maybeSingle();

  const propertyId = link?.external_account_id;
  if (!propertyId) return 0;

  const accessToken = await getGoogleAccessToken(admin, workspaceId, "ga4");
  if (!accessToken) return 0;

  const result = await fetchGa4Metrics(accessToken, propertyId);
  if (!result) return 0;

  if (result.daily.length) {
    const updatedAt = new Date().toISOString();
    const rows = result.daily.map((day) => ({
      workspace_id: workspaceId,
      client_id: clientId,
      updated_at: updatedAt,
      ...day,
    }));
    await admin.from("ga4_daily_metrics").upsert(rows, { onConflict: "workspace_id,client_id,date" });
  }

  // Re-pull replaces the full rolling window, so clear stale breakdown rows first.
  await admin.from("ga4_breakdowns").delete().eq("workspace_id", workspaceId).eq("client_id", clientId);
  if (result.breakdowns.length) {
    const rows = result.breakdowns.map((breakdown) => ({
      workspace_id: workspaceId,
      client_id: clientId,
      ...breakdown,
    }));
    await admin.from("ga4_breakdowns").insert(rows);
  }

  return result.daily.length;
}
