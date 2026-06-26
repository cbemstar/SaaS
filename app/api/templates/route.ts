import { NextResponse } from "next/server";
import { z } from "zod";
import { createTemplate } from "@/lib/templates";
import { requireWorkspaceId } from "@/lib/workspace";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(280).default(""),
  sections: z.array(z.string()).default([]),
  accent: z.string().nullable().optional(),
  layout: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(["draft", "ready", "sent"]).optional(),
});

export async function POST(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Sign in to save templates" }, { status: 401 });
  }

  let payload: z.infer<typeof templateSchema>;
  try {
    payload = templateSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const template = await createTemplate(workspaceId, payload);
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "Could not create template" }, { status: 500 });
  }
}
