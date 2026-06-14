import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import type { Database } from "@/lib/supabase/types";
import { fetchGa4DailyPerformance } from "@/lib/connectors/ga4";
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
