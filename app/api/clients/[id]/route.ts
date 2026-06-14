import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteClientRecord, updateClientRecord } from "@/lib/clients";
import { requireWorkspaceId } from "@/lib/workspace";
import type { ChannelKey } from "@/lib/catalog";

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  channels: z.array(z.string()).optional(),
  status: z.enum(["active", "onboarding", "paused"]).optional(),
  contact_email: z.string().email().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const payload = updateClientSchema.parse(await request.json());
    const client = await updateClientRecord(workspaceId, id, {
      ...payload,
      channels: payload.channels as ChannelKey[] | undefined,
    });
    return NextResponse.json({ client });
  } catch (error) {
    console.error("Failed to update client", error);
    return NextResponse.json({ error: "Could not update client" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteClientRecord(workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete client", error);
    return NextResponse.json({ error: "Could not delete client" }, { status: 500 });
  }
}
