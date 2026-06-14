import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteScheduledReport, updateScheduledReport } from "@/lib/scheduled-reports";
import { requireWorkspaceId } from "@/lib/workspace";

const updateSchema = z.object({
  active: z.boolean().optional(),
  recipientEmail: z.string().email().optional(),
  cadence: z.enum(["weekly", "monthly"]).optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().min(1).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const schedule = await updateScheduledReport(workspaceId, id, payload);
    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteScheduledReport(workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
