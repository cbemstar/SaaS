import type { ChannelKey, DailyPerformancePoint, Totals } from "@/lib/catalog";
import { channels } from "@/lib/catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ConnectorCatalogItem } from "@/lib/data";
import { filterSeriesToChannels, organicForChannels, spendForChannels } from "@/lib/performance-data";

export type DashboardDataStatus =
  | "empty"
  | "no_connectors"
  | "awaiting_mapping"
  | "awaiting_sync"
  | "live";

export type DashboardMeta = {
  status: DashboardDataStatus;
  hasLiveData: boolean;
  performanceDayCount: number;
  syncedClientCount: number;
  totalClientCount: number;
  unmappedClientCount: number;
  lastSyncLabel: string | null;
  connectedConnectors: ConnectorCatalogItem[];
  liveChannelSpend: { channel: ChannelKey; label: string; spend: number }[];
};

const emptyTotals: Totals = {
  spend: 0,
  conversions: 0,
  roas: 0,
  ctr: 0,
  cpa: 0,
  spendDelta: 0,
  conversionsDelta: 0,
  roasDelta: 0,
  ctrDelta: 0,
  cpaDelta: 0,
};

function daySpend(day: DailyPerformancePoint, activeChannels?: ChannelKey[]) {
  if (activeChannels?.length) {
    return spendForChannels(day, activeChannels);
  }
  return day.meta + day.google_ads + day.tiktok + day.linkedin;
}

export function calculateTotalsFromPerformance(
  dailyPerformance: DailyPerformancePoint[],
  activeChannels?: ChannelKey[],
): Totals {
  if (dailyPerformance.length === 0) {
    return emptyTotals;
  }

  const spend = dailyPerformance.reduce((sum, day) => sum + daySpend(day, activeChannels), 0);
  const conversions = dailyPerformance.reduce((sum, day) => sum + day.conversions, 0);
  const midpoint = Math.floor(dailyPerformance.length / 2);
  const firstHalf = dailyPerformance.slice(0, midpoint);
  const secondHalf = dailyPerformance.slice(midpoint);
  const firstSpend = firstHalf.reduce((sum, day) => sum + daySpend(day, activeChannels), 0);
  const secondSpend = secondHalf.reduce((sum, day) => sum + daySpend(day, activeChannels), 0);
  const firstConv = firstHalf.reduce((sum, day) => sum + day.conversions, 0);
  const secondConv = secondHalf.reduce((sum, day) => sum + day.conversions, 0);
  const spendDelta = firstSpend > 0 ? ((secondSpend - firstSpend) / firstSpend) * 100 : 0;
  const conversionsDelta = firstConv > 0 ? ((secondConv - firstConv) / firstConv) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const firstCpa = firstConv > 0 ? firstSpend / firstConv : 0;
  const secondCpa = secondConv > 0 ? secondSpend / secondConv : 0;
  const cpaDelta = firstCpa > 0 ? ((secondCpa - firstCpa) / firstCpa) * 100 : 0;

  return {
    spend,
    conversions,
    roas: 0,
    ctr: 0,
    cpa,
    spendDelta,
    conversionsDelta,
    roasDelta: 0,
    ctrDelta: 0,
    cpaDelta,
  };
}

export function buildSparkSeries(
  dailyPerformance: DailyPerformancePoint[],
  pick: (day: DailyPerformancePoint) => number,
  length = 14,
): number[] {
  if (dailyPerformance.length === 0) {
    return [];
  }

  return dailyPerformance.slice(-length).map(pick);
}

export function channelSpendBreakdown(
  dailyPerformance: DailyPerformancePoint[],
  activeChannels?: ChannelKey[],
) {
  const totals: Record<ChannelKey, number> = {
    meta: 0,
    google_ads: 0,
    linkedin: 0,
    tiktok: 0,
    ga4: 0,
    search_console: 0,
  };

  for (const day of dailyPerformance) {
    if (!activeChannels || activeChannels.includes("meta")) totals.meta += day.meta;
    if (!activeChannels || activeChannels.includes("google_ads")) totals.google_ads += day.google_ads;
    if (!activeChannels || activeChannels.includes("linkedin")) totals.linkedin += day.linkedin;
    if (!activeChannels || activeChannels.includes("tiktok")) totals.tiktok += day.tiktok;
  }

  const keys = activeChannels ?? (Object.keys(totals) as ChannelKey[]);

  return keys
    .map((channel) => ({
      channel,
      label: channels[channel].label,
      spend: totals[channel],
    }))
    .filter((item) => item.spend > 0)
    .sort((a, b) => b.spend - a.spend);
}

export function organicChannelBreakdown(
  dailyPerformance: DailyPerformancePoint[],
  activeChannels?: ChannelKey[],
) {
  const totals = {
    ga4: 0,
    search_console: 0,
  };

  for (const day of dailyPerformance) {
    if (!activeChannels || activeChannels.includes("ga4")) totals.ga4 += day.ga4;
    if (!activeChannels || activeChannels.includes("search_console")) {
      totals.search_console += day.search_console;
    }
  }

  const keys = (activeChannels ?? (["ga4", "search_console"] as ChannelKey[])).filter(
    (channel) => channel === "ga4" || channel === "search_console",
  );

  return keys
    .map((channel) => ({
      channel,
      label: channels[channel].label,
      value: totals[channel],
      unit: channel === "ga4" ? "sessions" : "clicks",
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

async function countUnmappedClients(workspaceId: string, connectedChannelKeys: ChannelKey[]) {
  const admin = createSupabaseAdminClient();
  if (!admin || connectedChannelKeys.length === 0) {
    return 0;
  }

  const [{ data: clients }, { data: links }] = await Promise.all([
    admin.from("clients").select("id, channels").eq("workspace_id", workspaceId),
    admin.from("client_connector_links").select("client_id, channel, external_account_id").eq("workspace_id", workspaceId),
  ]);

  if (!clients?.length) {
    return 0;
  }

  const linkSet = new Set(
    (links ?? [])
      .filter((link) => link.external_account_id)
      .map((link) => `${link.client_id}:${link.channel}`),
  );

  let unmapped = 0;
  for (const client of clients) {
    const clientChannels = (client.channels as ChannelKey[]).filter((channel) => connectedChannelKeys.includes(channel));
    if (clientChannels.length === 0) {
      continue;
    }

    const hasAllLinks = clientChannels.every((channel) => linkSet.has(`${client.id}:${channel}`));
    if (!hasAllLinks) {
      unmapped += 1;
    }
  }

  return unmapped;
}

export async function getDashboardMeta(
  workspaceId: string,
  connectors: ConnectorCatalogItem[],
  dailyPerformance: DailyPerformancePoint[],
  totalClientCount: number,
  authorizedChannelKeys?: ChannelKey[],
): Promise<DashboardMeta> {
  const connectedChannelKeys =
    authorizedChannelKeys ??
    connectors
      .filter((connector) => connector.status === "connected" || connector.status === "action_required")
      .map((connector) => connector.key);
  const connectedConnectors = connectors.filter((connector) =>
    connectedChannelKeys.includes(connector.key),
  );
  const liveChannelSpend = channelSpendBreakdown(dailyPerformance, connectedChannelKeys);
  const syncedClientIds = new Set(
    dailyPerformance.length > 0
      ? await getSyncedClientIds(workspaceId)
      : [],
  );

  const lastSyncLabel =
    connectedConnectors
      .map((connector) => connector.lastSync)
      .filter((value) => value && value !== "Never")
      .sort()
      .at(-1) ?? null;

  const unmappedClientCount = await countUnmappedClients(workspaceId, connectedChannelKeys);
  const connectedSpend = dailyPerformance.reduce(
    (sum, day) => sum + spendForChannels(day, connectedChannelKeys),
    0,
  );
  const connectedOrganic = dailyPerformance.reduce(
    (sum, day) => sum + organicForChannels(day, connectedChannelKeys),
    0,
  );
  const hasLiveData =
    connectedChannelKeys.length > 0 &&
    dailyPerformance.length > 0 &&
    (connectedSpend > 0 || connectedOrganic > 0);

  let status: DashboardDataStatus = "empty";
  if (totalClientCount === 0) {
    status = "empty";
  } else if (connectedConnectors.length === 0) {
    status = "no_connectors";
  } else if (unmappedClientCount > 0) {
    status = "awaiting_mapping";
  } else if (!hasLiveData) {
    status = "awaiting_sync";
  } else {
    status = "live";
  }

  return {
    status,
    hasLiveData,
    performanceDayCount: dailyPerformance.length,
    syncedClientCount: syncedClientIds.size,
    totalClientCount,
    unmappedClientCount,
    lastSyncLabel,
    connectedConnectors,
    liveChannelSpend,
  };
}

async function getConnectedChannelKeysFromDb(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, workspaceId: string) {
  const { data } = await admin
    .from("connector_accounts")
    .select("channel, status")
    .eq("workspace_id", workspaceId);

  return (data ?? [])
    .filter((connector) => connector.status === "connected" || connector.status === "action_required")
    .map((connector) => connector.channel as ChannelKey);
}

async function getSyncedClientIds(workspaceId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Set<string>();
  }

  const { data } = await admin
    .from("daily_performance")
    .select("client_id")
    .eq("workspace_id", workspaceId)
    .not("client_id", "is", null);

  return new Set((data ?? []).map((row) => row.client_id).filter(Boolean) as string[]);
}

export async function getClientPerformanceSummaries(
  workspaceId: string,
  connectedChannelKeys?: ChannelKey[],
  mappedClientIds?: Set<string>,
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Map<string, { spend: number; conversions: number; spendDelta: number }>();
  }

  const activeChannels = connectedChannelKeys ?? (await getConnectedChannelKeysFromDb(admin, workspaceId));
  const { getMappedClientIds } = await import("@/lib/performance-data");
  const mapped =
    mappedClientIds ?? (await getMappedClientIds(admin, workspaceId, activeChannels));

  const { data } = await admin
    .from("daily_performance")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("date", { ascending: true });

  if (!data?.length) {
    return new Map();
  }

  const byClient = new Map<string, DailyPerformancePoint[]>();

  for (const row of data) {
    if (!row.client_id) continue;
    if (mapped.size > 0 && !mapped.has(row.client_id)) continue;
    const point: DailyPerformancePoint = {
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
    const current = byClient.get(row.client_id) ?? [];
    current.push(filterSeriesToChannels([point], activeChannels)[0]);
    byClient.set(row.client_id, current);
  }

  const summaries = new Map<string, { spend: number; conversions: number; spendDelta: number }>();

  for (const [clientId, points] of byClient) {
    const totals = calculateTotalsFromPerformance(points, activeChannels);
    summaries.set(clientId, {
      spend: totals.spend,
      conversions: totals.conversions,
      spendDelta: totals.spendDelta,
    });
  }

  return summaries;
}
