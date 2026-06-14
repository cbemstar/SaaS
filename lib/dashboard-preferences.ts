import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/workspace";
import type { DashboardLayout } from "@/lib/ga4-aggregate";

/**
 * Per-user dashboard layout (which cards, order, sizes, filters) for a scope
 * ('overview' or a client_id). Stored in dashboard_preferences via the service
 * role; access is scoped by (workspace_id, user_id) in code.
 */
export async function getDashboardLayout(workspaceId: string, scope: string): Promise<DashboardLayout | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("dashboard_preferences")
    .select("layout")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("scope", scope)
    .maybeSingle();

  return (data?.layout as DashboardLayout | undefined) ?? null;
}

export async function saveDashboardLayout(workspaceId: string, scope: string, layout: DashboardLayout) {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Unauthorized");

  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Database is not configured");

  const { error } = await admin.from("dashboard_preferences").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      scope,
      layout: layout as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,user_id,scope" },
  );

  if (error) {
    console.error("Failed to save dashboard layout", error);
    throw new Error("Could not save layout");
  }
}
