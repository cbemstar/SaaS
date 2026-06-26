import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { requireWorkspaceId, getActiveWorkspace } from "@/lib/workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { markTemplateSent } from "@/lib/templates";
import { appUrl, resendApiKey } from "@/lib/env";

const bodySchema = z.object({
  templateId: z.string().min(1),
  clientId: z.string().min(1),
  days: z.number().int().min(1).max(3650).default(30),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  // Validate the template + client belong to this workspace before sharing.
  const [{ data: template }, { data: client }] = await Promise.all([
    admin.from("report_templates").select("id, name").eq("workspace_id", workspaceId).eq("id", body.templateId).maybeSingle(),
    admin.from("clients").select("id, name").eq("workspace_id", workspaceId).eq("id", body.clientId).maybeSingle(),
  ]);
  if (!template || !client) {
    return NextResponse.json({ error: "Template or client not found" }, { status: 404 });
  }

  const token = randomUUID();
  const { error } = await admin.from("report_shares").insert({
    token,
    workspace_id: workspaceId,
    template_id: body.templateId,
    client_id: body.clientId,
    days: body.days,
  });
  if (error) {
    console.error("Failed to create report share", error);
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }

  // A shared report counts as delivered — reflect that in the report's status.
  await markTemplateSent(workspaceId, body.templateId);

  const url = `${appUrl}/r/${token}`;
  let emailed = false;

  if (body.email && resendApiKey) {
    const workspace = await getActiveWorkspace();
    const agency = workspace?.name ?? "Your agency";
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "Kōrero <onboarding@resend.dev>",
        to: body.email,
        subject: `${client.name} — performance report from ${agency}`,
        html: `<p>${agency} has shared a performance report for <strong>${client.name}</strong>.</p><p><a href="${url}">View the report</a></p>`,
      });
      emailed = true;
    } catch (sendError) {
      console.error("Failed to email report link", sendError);
    }
  }

  return NextResponse.json({ url, token, emailed });
}
