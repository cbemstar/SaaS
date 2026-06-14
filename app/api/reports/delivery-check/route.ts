import { NextResponse } from "next/server";
import { countPendingInsightReviews, reportIncludesAiNarrative } from "@/lib/report-approval";
import { getActiveWorkspace, requireWorkspaceId } from "@/lib/workspace";

export async function GET(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const clientId = params.get("clientId");
  const blocks = params.get("blocks")?.split(",").filter(Boolean) ?? [];

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const workspace = await getActiveWorkspace();
  const humanReview = workspace?.ai_human_review ?? true;
  const includesAi = reportIncludesAiNarrative(blocks);
  const pendingReviews =
    humanReview && includesAi ? await countPendingInsightReviews(workspaceId, clientId) : 0;

  return NextResponse.json({
    humanReview,
    includesAi,
    pendingReviews,
    canSend: pendingReviews === 0,
  });
}
