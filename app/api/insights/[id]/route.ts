import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceId } from "@/lib/workspace";

const insightActionSchema = z.object({
  action: z.enum(["dismiss", "approve"]).default("dismiss"),
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
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true });
  }

  let action: "dismiss" | "approve" = "dismiss";
  try {
    const body = await request.json();
    action = insightActionSchema.parse(body).action;
  } catch {
    action = "dismiss";
  }

  const updates =
    action === "approve"
      ? { approved: true }
      : { dismissed: true };

  const { error } = await admin
    .from("insights")
    .update(updates)
    .eq("workspace_id", workspaceId)
    .eq("id", id);

  if (error) {
    console.error(`Failed to ${action} insight`, error);
    return NextResponse.json({ error: `Could not ${action} insight` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action });
}
