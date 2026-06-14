import { Resend } from "resend";
import { appUrl, resendApiKey } from "@/lib/env";
import { recordReportDelivery } from "@/lib/report-deliveries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WorkspaceRow } from "@/lib/supabase/types";

type DeliverReportInput = {
  workspaceId: string;
  clientId: string;
  clientName: string;
  recipientEmail: string;
  blocks: string[];
  reportName: string;
  agencyName?: string;
  workspace?: WorkspaceRow | null;
  reportId?: string | null;
  scheduledReportId?: string | null;
  deliveryType?: "manual" | "scheduled";
  sentBy?: string | null;
};

function buildReportEmailHtml(input: DeliverReportInput, reportUrl: string) {
  const accent = input.workspace?.accent_color ?? "#1f6f5c";
  const footer = input.workspace?.report_footer?.trim();
  const whiteLabel = input.workspace?.white_label ?? true;
  const logoUrl = input.workspace?.logo_url?.trim();
  const agency = input.agencyName ?? "your agency";

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${agency}" style="max-height:40px;margin-bottom:16px;" />`
    : `<div style="font-size:18px;font-weight:600;color:${accent};margin-bottom:16px;">${agency}</div>`;

  const footerBlock = footer
    ? `<p style="color:#666;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">${footer}</p>`
    : "";

  const koreroAttribution = whiteLabel
    ? ""
    : `<p style="color:#999;font-size:11px;margin-top:12px;">Sent via Kōrero</p>`;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:560px;">
      ${logoBlock}
      <p>Your performance report for <strong>${input.clientName}</strong> from <strong>${agency}</strong> is ready.</p>
      <p style="margin:24px 0;">
        <a href="${reportUrl}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
          View report
        </a>
      </p>
      <p style="color:#666;font-size:13px;">Or copy this link: <a href="${reportUrl}" style="color:${accent};">${reportUrl}</a></p>
      ${footerBlock}
      ${koreroAttribution}
    </div>
  `;
}

export async function deliverReportEmail(input: DeliverReportInput) {
  if (!resendApiKey) {
    throw new Error("Email delivery is not configured");
  }

  const blocksParam = encodeURIComponent(input.blocks.join(","));
  const reportUrl = `${appUrl}/api/reports/pdf?clientId=${encodeURIComponent(input.clientId)}&blocks=${blocksParam}`;
  const resend = new Resend(resendApiKey);
  const deliveryType = input.deliveryType ?? "manual";

  try {
    await resend.emails.send({
      from: "Kōrero <onboarding@resend.dev>",
      to: input.recipientEmail,
      subject: `${input.reportName} — ${input.clientName}`,
      html: buildReportEmailHtml(input, reportUrl),
    });

    await recordReportDelivery({
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      reportId: input.reportId,
      scheduledReportId: input.scheduledReportId,
      recipientEmail: input.recipientEmail,
      reportName: input.reportName,
      blocks: input.blocks,
      deliveryType,
      status: "sent",
      sentBy: input.sentBy,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send report";
    await recordReportDelivery({
      workspaceId: input.workspaceId,
      clientId: input.clientId,
      reportId: input.reportId,
      scheduledReportId: input.scheduledReportId,
      recipientEmail: input.recipientEmail,
      reportName: input.reportName,
      blocks: input.blocks,
      deliveryType,
      status: "failed",
      errorMessage: message,
      sentBy: input.sentBy,
    });
    throw error;
  }
}

export async function recordSentReport(input: {
  workspaceId: string;
  clientId: string;
  templateId: string;
  name: string;
  blocks: string[];
  reportId?: string;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  if (input.reportId) {
    const { error } = await admin
      .from("reports")
      .update({ status: "sent", blocks: input.blocks, name: input.name, updated_at: new Date().toISOString() })
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.reportId);

    if (error) {
      console.error("Failed to update sent report", error);
    }
    return input.reportId;
  }

  const { data, error } = await admin
    .from("reports")
    .insert({
      workspace_id: input.workspaceId,
      client_id: input.clientId,
      template_id: input.templateId,
      name: input.name,
      blocks: input.blocks,
      status: "sent",
      scheduled_for: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to record sent report", error);
    return null;
  }

  return data.id as string;
}
