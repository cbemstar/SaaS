import { NextResponse, type NextRequest } from "next/server";
import { discoverConnectorAccounts } from "@/lib/connectors/account-discovery";
import { isConnectorKey } from "@/lib/connectors";
import { requireWorkspaceId } from "@/lib/workspace";

type RouteContext = {
  params: Promise<{ channel: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel } = await params;
  if (!isConnectorKey(channel)) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  const result = await discoverConnectorAccounts(workspaceId, channel);
  return NextResponse.json(result);
}
