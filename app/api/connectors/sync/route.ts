import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncWorkspaceConnectors } from "@/lib/connectors/sync-workspace";
import { requireWorkspaceId } from "@/lib/workspace";

export async function POST() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const result = await syncWorkspaceConnectors(admin, workspaceId, { triggeredBy: "all" });

  let message: string;
  if (result.rowsImported > 0) {
    message = `Synced ${result.syncedClients} client${result.syncedClients === 1 ? "" : "s"} · ${result.rowsImported} day${result.rowsImported === 1 ? "" : "s"} imported${result.sanitizedRows > 0 ? ` · cleared stale data from ${result.sanitizedRows} row${result.sanitizedRows === 1 ? "" : "s"}` : ""}.`;
  } else if (result.clearedClients > 0) {
    message = `Connected accounts returned no data in the last 30 days. Cleared stale metrics for ${result.clearedClients} client${result.clearedClients === 1 ? "" : "s"}.`;
  } else {
    message = "No live connector data available to sync. Connect accounts, map them to clients, and try again.";
  }

  return NextResponse.json({
    ...result,
    message,
  });
}
