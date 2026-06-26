import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTemplate, duplicateTemplate, updateTemplate } from "@/lib/templates";
import { requireWorkspaceId } from "@/lib/workspace";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
  sections: z.array(z.string()).optional(),
  accent: z.string().nullable().optional(),
  layout: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(["draft", "ready", "sent"]).optional(),
  action: z.literal("duplicate").optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Sign in to edit templates" }, { status: 401 });
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
    if (payload.action === "duplicate") {
      const template = await duplicateTemplate(workspaceId, id);
      return NextResponse.json({ template });
    }
    const template = await updateTemplate(workspaceId, id, payload);
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "Could not update template" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Sign in to delete templates" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteTemplate(workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete template" }, { status: 500 });
  }
}
