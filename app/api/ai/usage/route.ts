import { NextResponse } from "next/server";
import { requireWorkspaceId, getActiveWorkspace } from "@/lib/workspace";
import { getAiUsage } from "@/lib/ai/usage";

export async function GET() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspace = await getActiveWorkspace();
  const usage = await getAiUsage(workspaceId, workspace);
  return NextResponse.json({ usage });
}
