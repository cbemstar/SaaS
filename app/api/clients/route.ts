import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createClientRecord,
  refreshClientMetricsFromPerformance,
} from "@/lib/clients";
import { requireWorkspaceId } from "@/lib/workspace";
import type { ChannelKey } from "@/lib/catalog";

const createClientSchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  channels: z.array(z.string()).default([]),
  status: z.enum(["active", "onboarding", "paused"]).optional(),
});

export async function POST(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = createClientSchema.parse(await request.json());
    const client = await createClientRecord(workspaceId, {
      name: payload.name,
      industry: payload.industry,
      channels: payload.channels as ChannelKey[],
      status: payload.status,
    });
    await refreshClientMetricsFromPerformance(workspaceId, client.id);
    return NextResponse.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create client";
    const status = message.includes("plan allows") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { getClients } = await import("@/lib/data");
  const clients = await getClients();
  return NextResponse.json({ clients });
}
