import { NextResponse } from "next/server";
import { purgeWorkspacePerformance } from "@/lib/performance-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

  const deletedRows = await purgeWorkspacePerformance(admin, workspaceId);

  return NextResponse.json({
    deletedRows,
    message:
      deletedRows === 0
        ? "No synced metrics to clear."
        : `Cleared ${deletedRows} synced metric row${deletedRows === 1 ? "" : "s"}. Run sync to import fresh data.`,
  });
}
