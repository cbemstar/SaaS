import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncWorkspaceConnectors } from "@/lib/connectors/sync-workspace";
import { processDueScheduledReports } from "@/lib/scheduled-reports";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const { data: workspaces, error: workspacesError } = await supabase.from("workspaces").select("id");
  if (workspacesError || !workspaces?.length) {
    console.error("Connector sync failed to resolve workspaces", workspacesError);
    return NextResponse.json({ error: "No workspaces available for sync" }, { status: 404 });
  }

  let syncedClients = 0;
  let liveClients = 0;
  let skippedClients = 0;

  // Connector sync is on-demand by default to respect platform rate limits.
  if (process.env.CONNECTOR_CRON_SYNC === "true") {
    for (const workspace of workspaces) {
      const result = await syncWorkspaceConnectors(supabase, workspace.id, { triggeredBy: "cron" });
      syncedClients += result.syncedClients;
      liveClients += result.liveClients;
      skippedClients += result.skippedClients;
    }
  }

  let scheduled = { processed: 0, sent: 0, failed: 0 };
  try {
    scheduled = await processDueScheduledReports();
  } catch (scheduleError) {
    console.error("Scheduled report processing failed", scheduleError);
  }

  return NextResponse.json({
    workspaces: workspaces.length,
    connectorCronSyncEnabled: process.env.CONNECTOR_CRON_SYNC === "true",
    syncedClients,
    liveClients,
    skippedClients,
    scheduled,
  });
}
