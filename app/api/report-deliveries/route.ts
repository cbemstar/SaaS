import { NextResponse } from "next/server";
import { listReportDeliveries } from "@/lib/report-deliveries";
import { requireWorkspaceId } from "@/lib/workspace";

export async function GET(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
  const deliveries = await listReportDeliveries(workspaceId, clientId);
  return NextResponse.json({ deliveries });
}
