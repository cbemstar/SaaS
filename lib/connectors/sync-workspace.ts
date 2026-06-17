import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import type { Database } from "@/lib/supabase/types";
import { refreshClientMetricsFromPerformance } from "@/lib/clients";
import { finishSyncRun, startSyncRun, type SyncRunStatus } from "@/lib/connector-sync-runs";
import {
  getConnectedChannelKeys,
  mergePerformanceSeedRow,
  purgeOrphanWorkspacePerformance,
  purgeUnmappedClientPerformance,
  sanitizeDisconnectedChannelMetrics,
} from "@/lib/performance-data";
import { pullLivePerformanceForClient, syncRichMetricsForClient } from "@/lib/connectors/sync-live";

type AdminClient = SupabaseClient<Database>;

export type WorkspaceSyncResult = {
  syncedClients: number;
  liveClients: number;
  clearedClients: number;
  skippedClients: number;
  rowsImported: number;
  sanitizedRows: number;
};

type SyncOptions = {
  channel?: ChannelKey;
  triggeredBy?: "user" | "cron" | "all";
  skipSanitize?: boolean;
};

async function upsertClientPerformance(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  syncedChannels: ChannelKey[],
  fullSync: boolean,
) {
  const livePerformance = await pullLivePerformanceForClient(admin, workspaceId, clientId, syncedChannels);
  // An empty/null pull is indistinguishable from a transient API error or an
  // expired token (fetchers swallow errors and return null). Clearing here would
  // wipe previously-synced data on any hiccup — so we skip and leave data intact.
  // Deliberate removal is handled by disconnect/unmap/purge, not by an empty sync.
  if (!livePerformance?.length) {
    return 0;
  }

  const totalLiveSpend = livePerformance.reduce(
    (sum, day) => sum + day.meta + day.google_ads + day.tiktok + day.linkedin,
    0,
  );
  const totalLiveOrganic = livePerformance.reduce((sum, day) => sum + day.ga4 + day.search_console, 0);
  const totalLiveConversions = livePerformance.reduce((sum, day) => sum + day.conversions, 0);

  if (totalLiveSpend === 0 && totalLiveOrganic === 0 && totalLiveConversions === 0) {
    // Got a response but every metric is zero — could be a genuine no-activity
    // period or a degraded response. Don't destroy existing data; skip.
    return 0;
  }

  const dates = livePerformance.map((day) => day.date);
  const { data: existingRows } = await admin
    .from("daily_performance")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .in("date", dates);

  const existingByDate = new Map((existingRows ?? []).map((row) => [row.date, row]));
  const performanceRows = livePerformance.map((day) => {
    const existing = existingByDate.get(day.date);
    const merged = mergePerformanceSeedRow(existing, day, syncedChannels, fullSync);
    return {
      workspace_id: workspaceId,
      client_id: clientId,
      ...merged,
    };
  });

  await admin.from("daily_performance").upsert(performanceRows, {
    onConflict: "workspace_id,client_id,date",
  });
  await refreshClientMetricsFromPerformance(workspaceId, clientId);

  return performanceRows.length;
}

export async function syncWorkspaceConnectors(
  admin: AdminClient,
  workspaceId: string,
  options: SyncOptions = {},
): Promise<WorkspaceSyncResult> {
  const channel = options.channel;
  const triggeredBy = options.triggeredBy ?? (channel ? "user" : "all");
  const runId = await startSyncRun(admin, workspaceId, channel ?? "all", triggeredBy);

  try {
    const result = await runWorkspaceSync(admin, workspaceId, options);
    const status: SyncRunStatus =
      result.liveClients > 0
        ? result.skippedClients > 0
          ? "partial"
          : "success"
        : result.clearedClients > 0
          ? "partial"
          : "failed";

    if (runId) {
      await finishSyncRun(admin, runId, {
        status,
        syncedClients: result.syncedClients,
        skippedClients: result.skippedClients,
        rowsImported: result.rowsImported,
        errorMessage:
          result.liveClients === 0 && result.rowsImported === 0 ? "No live data imported" : undefined,
      });
    }

    return result;
  } catch (error) {
    if (runId) {
      await finishSyncRun(admin, runId, {
        status: "failed",
        syncedClients: 0,
        skippedClients: 0,
        rowsImported: 0,
        errorMessage: error instanceof Error ? error.message : "Sync failed",
      });
    }
    throw error;
  }
}

async function runWorkspaceSync(
  admin: AdminClient,
  workspaceId: string,
  options: SyncOptions,
): Promise<WorkspaceSyncResult> {
  const [{ data: clients }, connectedChannels] = await Promise.all([
    admin.from("clients").select("id, channels").eq("workspace_id", workspaceId),
    getConnectedChannelKeys(admin, workspaceId),
  ]);

  if (!clients?.length) {
    return {
      syncedClients: 0,
      liveClients: 0,
      clearedClients: 0,
      skippedClients: 0,
      rowsImported: 0,
      sanitizedRows: 0,
    };
  }

  const connectedSet = new Set(connectedChannels);
  const sanitizedRows = options.skipSanitize
    ? 0
    : await sanitizeDisconnectedChannelMetrics(admin, workspaceId, connectedChannels);

  // Converge DB hygiene during sync (formerly done on every dashboard render):
  // drop orphaned rows and rows for clients no longer mapped to a synced channel.
  if (!options.skipSanitize) {
    await purgeOrphanWorkspacePerformance(admin, workspaceId);
    await purgeUnmappedClientPerformance(admin, workspaceId, connectedChannels);
  }

  const syncChannels = options.channel
    ? connectedChannels.filter((value) => value === options.channel)
    : connectedChannels;

  if (syncChannels.length === 0) {
    return {
      syncedClients: 0,
      liveClients: 0,
      clearedClients: 0,
      skippedClients: clients.length,
      rowsImported: 0,
      sanitizedRows,
    };
  }

  const fullSync = !options.channel;
  let syncedClients = 0;
  let liveClients = 0;
  let clearedClients = 0;
  let skippedClients = 0;
  let rowsImported = 0;

  for (const client of clients) {
    const activeChannels = (client.channels as ChannelKey[]).filter((value) => connectedSet.has(value));
    const channelsForSync = options.channel
      ? activeChannels.filter((value) => value === options.channel)
      : activeChannels;

    if (channelsForSync.length === 0) {
      skippedClients += 1;
      continue;
    }

    await syncRichMetricsForClient(admin, workspaceId, client.id, channelsForSync);

    const imported = await upsertClientPerformance(
      admin,
      workspaceId,
      client.id,
      channelsForSync,
      fullSync && channelsForSync.length === activeChannels.length,
    );

    if (imported === 0) {
      skippedClients += 1;
      continue;
    }

    if (imported < 0) {
      clearedClients += 1;
      continue;
    }

    rowsImported += imported;
    syncedClients += 1;
    liveClients += 1;
  }

  if (liveClients > 0 || clearedClients > 0) {
    const now = new Date().toLocaleString("en-NZ", { hour: "numeric", minute: "2-digit" });
    let updateQuery = admin
      .from("connector_accounts")
      .update({ last_sync: now })
      .eq("workspace_id", workspaceId)
      .in("status", ["connected", "action_required"]);

    if (options.channel) {
      updateQuery = updateQuery.eq("channel", options.channel);
    }

    await updateQuery;
  }

  return { syncedClients, liveClients, clearedClients, skippedClients, rowsImported, sanitizedRows };
}

export async function syncConnectorChannel(
  admin: AdminClient,
  workspaceId: string,
  channel: ChannelKey,
): Promise<WorkspaceSyncResult> {
  return syncWorkspaceConnectors(admin, workspaceId, { channel, triggeredBy: "user" });
}
