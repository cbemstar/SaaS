import { NextResponse } from "next/server";
import { requireWorkspaceId } from "@/lib/workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedClientSampleData } from "@/lib/dev/sample-data";

/**
 * Loads sample metrics for every client in the caller's workspace, across all
 * sources — so the multi-source dashboard and report builder can be tested
 * without connecting real ad/analytics accounts. Writes only to the caller's
 * own workspace. Idempotent (re-running overwrites the sample data).
 */
export async function POST() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const { data: clients } = await admin.from("clients").select("id").eq("workspace_id", workspaceId);
  if (!clients?.length) {
    return NextResponse.json({ error: "Add a client first, then load sample data." }, { status: 400 });
  }

  for (const client of clients) {
    await seedClientSampleData(admin, workspaceId, client.id);
  }

  return NextResponse.json({ ok: true, seededClients: clients.length });
}
