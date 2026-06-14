import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteClientConnectorLink,
  listClientConnectorLinks,
  upsertClientConnectorLink,
} from "@/lib/client-connector-links";
import { isConnectorKey } from "@/lib/connectors";
import { getClient } from "@/lib/data";
import { requireWorkspaceId } from "@/lib/workspace";

const upsertLinkSchema = z.object({
  channel: z.string(),
  externalAccountId: z.string().min(1),
  externalAccountName: z.string().optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }

  const links = await listClientConnectorLinks(workspaceId, id);
  return NextResponse.json({ links });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await getClient(id);
  if (!client) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }

  try {
    const payload = upsertLinkSchema.parse(await request.json());
    if (!isConnectorKey(payload.channel)) {
      return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
    }

    const link = await upsertClientConnectorLink(workspaceId, id, {
      channel: payload.channel,
      externalAccountId: payload.externalAccountId,
      externalAccountName: payload.externalAccountName,
    });

    return NextResponse.json({ link });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const channel = new URL(request.url).searchParams.get("channel");
  if (!channel || !isConnectorKey(channel)) {
    return NextResponse.json({ error: "Valid channel is required" }, { status: 400 });
  }

  try {
    await deleteClientConnectorLink(workspaceId, id, channel);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
