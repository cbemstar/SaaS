import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspacePlanName, getAiCreditsForPlan, type PricingPlanName } from "@/lib/billing";
import { workspaceUsesByok } from "@/lib/ai/provider";
import type { WorkspaceRow } from "@/lib/supabase/types";

export type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
  plan: PricingPlanName;
  byok: boolean;
  period: string;
};

/** Calendar month in UTC, e.g. "2026-06". One usage bucket per workspace per month. */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function readUsed(workspaceId: string, period: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  if (!admin) return 0;
  const { data } = await admin
    .from("ai_usage")
    .select("credits_used")
    .eq("workspace_id", workspaceId)
    .eq("period", period)
    .maybeSingle();
  return data?.credits_used ?? 0;
}

/** Full usage snapshot for display (sidebar, billing) and pre-flight checks. */
export async function getAiUsage(workspaceId: string, workspace?: WorkspaceRow | null): Promise<AiUsage> {
  const period = currentPeriod();
  const byok = workspaceUsesByok(workspace);
  const plan = await getWorkspacePlanName(workspaceId);
  const limit = getAiCreditsForPlan(plan);
  const used = byok ? 0 : await readUsed(workspaceId, period);
  return { used, limit, remaining: Math.max(0, limit - used), plan, byok, period };
}

/**
 * Pre-flight check before a metered generation. BYOK workspaces are always
 * allowed (they pay their own provider); metered workspaces must have credits.
 */
export async function checkAiCredit(
  workspaceId: string,
  workspace?: WorkspaceRow | null,
): Promise<{ allowed: boolean; usage: AiUsage }> {
  const usage = await getAiUsage(workspaceId, workspace);
  return { allowed: usage.byok || usage.remaining > 0, usage };
}

/**
 * Record one consumed credit after a successful metered generation. No-op for
 * BYOK. Uses an atomic DB increment so concurrent generations can't lose count.
 */
export async function recordAiUsage(workspaceId: string, workspace?: WorkspaceRow | null): Promise<void> {
  if (workspaceUsesByok(workspace)) return;
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.rpc("increment_ai_usage", {
    p_workspace_id: workspaceId,
    p_period: currentPeriod(),
    p_amount: 1,
  });
}
