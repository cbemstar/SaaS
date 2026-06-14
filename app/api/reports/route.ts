import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceId } from "@/lib/workspace";

const reportSchema = z.object({
  clientId: z.string(),
  templateId: z.string(),
  name: z.string().min(1),
  blocks: z.array(z.string()).default(["kpi", "ai", "perf", "mix", "conv"]),
  status: z.enum(["draft", "scheduled", "sent"]).default("draft"),
  scheduledFor: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const payload = reportSchema.parse(await request.json());
  const workspaceId = await requireWorkspaceId();
  const supabase = createSupabaseAdminClient();

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      workspace_id: workspaceId,
      client_id: payload.clientId,
      template_id: payload.templateId,
      name: payload.name,
      blocks: payload.blocks,
      status: payload.status,
      scheduled_for: payload.scheduledFor ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to save report", error);
    return NextResponse.json({ error: "Could not save report" }, { status: 500 });
  }

  const { data: templateRow } = await supabase
    .from("report_templates")
    .select("used")
    .eq("workspace_id", workspaceId)
    .eq("id", payload.templateId)
    .maybeSingle();

  if (templateRow) {
    await supabase
      .from("report_templates")
      .update({ used: (templateRow.used ?? 0) + 1 })
      .eq("workspace_id", workspaceId)
      .eq("id", payload.templateId);
  }

  return NextResponse.json({ mode: "supabase", report: data });
}
