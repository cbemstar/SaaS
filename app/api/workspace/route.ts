import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceId } from "@/lib/workspace";

const workspaceSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.enum(["NZD", "AUD"]).optional(),
  timezone: z.string().optional(),
  onboarded: z.boolean().optional(),
  logo_url: z.string().url().nullable().optional(),
  accent_color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u, "Use a hex colour like #1f6f5c")
    .nullable()
    .optional(),
  report_footer: z.string().max(280).nullable().optional(),
  primary_contact: z.string().max(160).nullable().optional(),
  white_label: z.boolean().optional(),
  ai_cite_evidence: z.boolean().optional(),
  ai_human_review: z.boolean().optional(),
  ai_tone: z.enum(["concise", "detailed", "persuasive"]).optional(),
});

export async function PATCH(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof workspaceSchema>;
  try {
    payload = workspaceSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("workspaces")
    .update(payload)
    .eq("id", workspaceId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update workspace", error);
    return NextResponse.json({ error: "Could not update workspace" }, { status: 500 });
  }

  return NextResponse.json({ workspace: data });
}

export async function GET() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data, error } = await admin.from("workspaces").select("*").eq("id", workspaceId).single();
  if (error) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({ workspace: data });
}
