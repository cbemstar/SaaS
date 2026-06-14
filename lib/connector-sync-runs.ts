import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import type { Database } from "@/lib/supabase/types";

type AdminClient = SupabaseClient<Database>;

export type SyncRunStatus = "success" | "partial" | "failed";
export type SyncTriggeredBy = "user" | "cron" | "all";

export type ConnectorSyncRun = {
  id: string;
  workspace_id: string;
  channel: string;
  status: SyncRunStatus;
  synced_clients: number;
  skipped_clients: number;
  rows_imported: number;
  error_message: string | null;
  triggered_by: SyncTriggeredBy;
  started_at: string;
  finished_at: string | null;
};

export async function startSyncRun(
  admin: AdminClient,
  workspaceId: string,
  channel: ChannelKey | "all",
  triggeredBy: SyncTriggeredBy,
): Promise<string | null> {
  const { data, error } = await admin
    .from("connector_sync_runs")
    .insert({
      workspace_id: workspaceId,
      channel,
      status: "partial",
      triggered_by: triggeredBy,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to start sync run", error);
    return null;
  }

  return data.id;
}

export async function finishSyncRun(
  admin: AdminClient,
  runId: string,
  result: {
    status: SyncRunStatus;
    syncedClients: number;
    skippedClients: number;
    rowsImported: number;
    errorMessage?: string;
  },
) {
  await admin
    .from("connector_sync_runs")
    .update({
      status: result.status,
      synced_clients: result.syncedClients,
      skipped_clients: result.skippedClients,
      rows_imported: result.rowsImported,
      error_message: result.errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

export async function getLastSyncRunForChannel(
  admin: AdminClient,
  workspaceId: string,
  channel: ChannelKey,
): Promise<ConnectorSyncRun | null> {
  const { data } = await admin
    .from("connector_sync_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("channel", channel)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ConnectorSyncRun | null;
}
