import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WorkspaceRow } from "@/lib/supabase/types";

const AI_NARRATIVE_BLOCKS = new Set(["ai", "recommendations"]);

export function reportIncludesAiNarrative(blocks: string[]) {
  return blocks.some((block) => AI_NARRATIVE_BLOCKS.has(block));
}

export async function countPendingInsightReviews(workspaceId: string, clientId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return 0;
  }

  const { count, error } = await admin
    .from("insights")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("clientId", clientId)
    .eq("dismissed", false)
    .eq("approved", false);

  if (error) {
    console.error("Failed to count pending insight reviews", error);
    return 0;
  }

  return count ?? 0;
}

export async function assertReportDeliveryAllowed(
  workspace: WorkspaceRow | null,
  workspaceId: string,
  clientId: string,
  blocks: string[],
) {
  if (!workspace?.ai_human_review) {
    return;
  }

  if (!reportIncludesAiNarrative(blocks)) {
    return;
  }

  const pending = await countPendingInsightReviews(workspaceId, clientId);
  if (pending > 0) {
    throw new Error(
      `Human review is on. Approve or dismiss ${pending} open insight${pending === 1 ? "" : "s"} for this client before sending AI narratives.`,
    );
  }
}
