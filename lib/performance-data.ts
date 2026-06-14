import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey, DailyPerformancePoint } from "@/lib/catalog";
import type { Database, DailyPerformanceRow } from "@/lib/supabase/types";
import type { PerformanceSeedRow } from "@/lib/connectors/meta";

type AdminClient = SupabaseClient<Database>;

export const PAID_SPEND_CHANNELS = ["meta", "google_ads", "tiktok", "linkedin"] as const;
export type PaidSpendChannel = (typeof PAID_SPEND_CHANNELS)[number];

export function isPaidSpendChannel(channel: ChannelKey): channel is PaidSpendChannel {
  return (PAID_SPEND_CHANNELS as readonly string[]).includes(channel);
}

export function spendForChannels(day: DailyPerformancePoint, activeChannels: ChannelKey[]) {
  let spend = 0;
  if (activeChannels.includes("meta")) spend += day.meta;
  if (activeChannels.includes("google_ads")) spend += day.google_ads;
  if (activeChannels.includes("tiktok")) spend += day.tiktok;
  if (activeChannels.includes("linkedin")) spend += day.linkedin;
  return spend;
}

export function organicForChannels(day: DailyPerformancePoint, activeChannels: ChannelKey[]) {
  let total = 0;
  if (activeChannels.includes("ga4")) total += day.ga4;
  if (activeChannels.includes("search_console")) total += day.search_console;
  return total;
}

export function hasMetricSignal(day: DailyPerformancePoint, activeChannels: ChannelKey[]) {
  return spendForChannels(day, activeChannels) + organicForChannels(day, activeChannels) + day.conversions > 0;
}

export function filterPointToChannels(
  point: DailyPerformancePoint,
  activeChannels: ChannelKey[],
): DailyPerformancePoint {
  return {
    date: point.date,
    label: point.label,
    meta: activeChannels.includes("meta") ? point.meta : 0,
    google_ads: activeChannels.includes("google_ads") ? point.google_ads : 0,
    tiktok: activeChannels.includes("tiktok") ? point.tiktok : 0,
    linkedin: activeChannels.includes("linkedin") ? point.linkedin : 0,
    ga4: activeChannels.includes("ga4") ? point.ga4 : 0,
    search_console: activeChannels.includes("search_console") ? point.search_console : 0,
    conversions: point.conversions,
  };
}

export function filterSeriesToChannels(
  series: DailyPerformancePoint[],
  activeChannels: ChannelKey[],
): DailyPerformancePoint[] {
  if (activeChannels.length === 0) {
    return series.map((point) => ({
      ...point,
      meta: 0,
      google_ads: 0,
      tiktok: 0,
      linkedin: 0,
      ga4: 0,
      search_console: 0,
      conversions: 0,
    }));
  }

  return series.map((point) => filterPointToChannels(point, activeChannels));
}

function rowToPoint(row: DailyPerformanceRow): DailyPerformancePoint {
  return {
    date: row.date,
    label: row.label,
    meta: row.meta,
    google_ads: row.google_ads,
    tiktok: row.tiktok,
    linkedin: row.linkedin,
    ga4: row.ga4,
    search_console: row.search_console,
    conversions: row.conversions,
  };
}

export function mergePerformanceSeedRow(
  existing: DailyPerformanceRow | undefined,
  incoming: PerformanceSeedRow,
  syncedChannels: ChannelKey[],
  fullSync: boolean,
): PerformanceSeedRow {
  const base = existing ? rowToPoint(existing) : null;

  return {
    date: incoming.date,
    label: incoming.label,
    meta: syncedChannels.includes("meta") ? incoming.meta : (base?.meta ?? 0),
    google_ads: syncedChannels.includes("google_ads") ? incoming.google_ads : (base?.google_ads ?? 0),
    tiktok: syncedChannels.includes("tiktok") ? incoming.tiktok : (base?.tiktok ?? 0),
    linkedin: syncedChannels.includes("linkedin") ? incoming.linkedin : (base?.linkedin ?? 0),
    ga4: syncedChannels.includes("ga4") ? incoming.ga4 : (existing?.ga4 ?? 0),
    search_console: syncedChannels.includes("search_console")
      ? incoming.search_console
      : (existing?.search_console ?? 0),
    conversions: fullSync ? incoming.conversions : (existing?.conversions ?? incoming.conversions),
  };
}

export async function getConnectedChannelKeys(admin: AdminClient, workspaceId: string): Promise<ChannelKey[]> {
  const [{ data: accounts }, { data: tokens }] = await Promise.all([
    admin.from("connector_accounts").select("channel, status").eq("workspace_id", workspaceId),
    admin.from("connector_tokens").select("channel, access_token").eq("workspace_id", workspaceId),
  ]);

  const tokenChannels = new Set(
    (tokens ?? [])
      .filter((row) => Boolean(row.access_token))
      .map((row) => row.channel as ChannelKey),
  );

  return (accounts ?? [])
    .filter(
      (connector) =>
        tokenChannels.has(connector.channel as ChannelKey) &&
        (connector.status === "connected" || connector.status === "action_required"),
    )
    .map((connector) => connector.channel as ChannelKey);
}

export async function sanitizeDisconnectedChannelMetrics(
  admin: AdminClient,
  workspaceId: string,
  connectedChannels?: ChannelKey[],
): Promise<number> {
  const active = connectedChannels ?? (await getConnectedChannelKeys(admin, workspaceId));
  const connected = new Set(active);

  const { data: rows } = await admin.from("daily_performance").select("*").eq("workspace_id", workspaceId);
  if (!rows?.length) {
    return 0;
  }

  let updated = 0;

  for (const row of rows) {
    const patch: Partial<DailyPerformanceRow> = {};
    if (!connected.has("meta") && row.meta !== 0) patch.meta = 0;
    if (!connected.has("google_ads") && row.google_ads !== 0) patch.google_ads = 0;
    if (!connected.has("tiktok") && row.tiktok !== 0) patch.tiktok = 0;
    if (!connected.has("linkedin") && row.linkedin !== 0) patch.linkedin = 0;
    if (!connected.has("ga4") && row.ga4 !== 0) patch.ga4 = 0;
    if (!connected.has("search_console") && row.search_console !== 0) patch.search_console = 0;

    if (Object.keys(patch).length === 0) {
      continue;
    }

    await admin.from("daily_performance").update(patch).eq("id", row.id);
    updated += 1;
  }

  return updated;
}

export async function getMappedClientIds(
  admin: AdminClient,
  workspaceId: string,
  channels: ChannelKey[],
): Promise<Set<string>> {
  if (channels.length === 0) {
    return new Set();
  }

  const { data } = await admin
    .from("client_connector_links")
    .select("client_id, channel, external_account_id")
    .eq("workspace_id", workspaceId)
    .in("channel", channels);

  return new Set(
    (data ?? [])
      .filter((link) => link.external_account_id)
      .map((link) => link.client_id),
  );
}

function rowHasAnySpend(row: DailyPerformanceRow) {
  return (
    row.meta +
      row.google_ads +
      row.tiktok +
      row.linkedin +
      row.ga4 +
      row.search_console +
      row.conversions >
    0
  );
}

/** Zeros synced channel columns for a client; deletes rows that become fully empty. */
export async function clearClientChannelMetrics(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  channels: ChannelKey[],
): Promise<number> {
  const { data: rows } = await admin
    .from("daily_performance")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId);

  if (!rows?.length) {
    return 0;
  }

  let touched = 0;

  for (const row of rows) {
    const patch: Partial<DailyPerformanceRow> = {};
    if (channels.includes("meta")) patch.meta = 0;
    if (channels.includes("google_ads")) patch.google_ads = 0;
    if (channels.includes("tiktok")) patch.tiktok = 0;
    if (channels.includes("linkedin")) patch.linkedin = 0;
    if (channels.includes("ga4")) patch.ga4 = 0;
    if (channels.includes("search_console")) patch.search_console = 0;

    const clearingOnlyPaid =
      (channels.includes("meta") ? row.meta : 0) +
        (channels.includes("google_ads") ? row.google_ads : 0) +
        (channels.includes("tiktok") ? row.tiktok : 0) +
        (channels.includes("linkedin") ? row.linkedin : 0) ===
      row.meta + row.google_ads + row.tiktok + row.linkedin;

    if (clearingOnlyPaid) {
      patch.conversions = 0;
    }

    if (Object.keys(patch).length === 0) {
      continue;
    }

    const next = { ...row, ...patch };
    if (rowHasAnySpend(next)) {
      await admin.from("daily_performance").update(patch).eq("id", row.id);
    } else {
      await admin.from("daily_performance").delete().eq("id", row.id);
    }
    touched += 1;
  }

  return touched;
}

/** Removes legacy workspace-level rows that were never tied to a client. */
export async function purgeOrphanWorkspacePerformance(
  admin: AdminClient,
  workspaceId: string,
): Promise<number> {
  const { data: rows } = await admin
    .from("daily_performance")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("client_id", null);

  const count = rows?.length ?? 0;
  if (count === 0) {
    return 0;
  }

  await admin.from("daily_performance").delete().eq("workspace_id", workspaceId).is("client_id", null);
  return count;
}

/** Removes performance rows for clients without a mapped ad account for synced channels. */
export async function purgeUnmappedClientPerformance(
  admin: AdminClient,
  workspaceId: string,
  channels: ChannelKey[],
): Promise<number> {
  const mapped = await getMappedClientIds(admin, workspaceId, channels);
  const { data: rows } = await admin
    .from("daily_performance")
    .select("id, client_id")
    .eq("workspace_id", workspaceId);

  let deleted = 0;
  for (const row of rows ?? []) {
    if (row.client_id && !mapped.has(row.client_id)) {
      await admin.from("daily_performance").delete().eq("id", row.id);
      deleted += 1;
    }
  }

  return deleted;
}

export async function purgeWorkspacePerformance(admin: AdminClient, workspaceId: string): Promise<number> {
  const { data: rows } = await admin.from("daily_performance").select("id").eq("workspace_id", workspaceId);
  const count = rows?.length ?? 0;

  if (count === 0) {
    return 0;
  }

  await admin.from("daily_performance").delete().eq("workspace_id", workspaceId);
  await admin
    .from("clients")
    .update({
      monthlySpend: 0,
      spendDelta: 0,
      conversions: 0,
      conversionsDelta: 0,
      roas: 0,
    })
    .eq("workspace_id", workspaceId);

  return count;
}
