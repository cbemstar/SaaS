import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getClient, getReportTemplates } from "@/lib/data";
import { assertReportDeliveryAllowed } from "@/lib/report-approval";
import { deliverReportEmail, recordSentReport } from "@/lib/report-delivery";
import { markTemplateSent } from "@/lib/templates";
import { blocksForTemplate } from "@/lib/report-blocks";
import { getActiveWorkspace, getAuthenticatedUser, requireWorkspaceId } from "@/lib/workspace";

const sendReportSchema = z.object({
  clientId: z.string(),
  templateId: z.string().optional(),
  reportId: z.string().uuid().optional(),
  recipientEmail: z.string().email().optional(),
  blocks: z.array(z.string()).optional(),
  reportName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const workspaceId = await requireWorkspaceId();
  const payload = sendReportSchema.parse(await request.json());
  const client = await getClient(payload.clientId);

  if (!client || !workspaceId) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }

  if (!payload.recipientEmail) {
    return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
  }

  const [workspace, templates, user] = await Promise.all([
    getActiveWorkspace(),
    getReportTemplates(),
    getAuthenticatedUser(),
  ]);
  const template = templates.find((item) => item.id === payload.templateId);
  const blocks = payload.blocks ?? blocksForTemplate(template);
  const reportName = payload.reportName ?? `${client.name} performance report`;

  try {
    await assertReportDeliveryAllowed(workspace, workspaceId, client.id, blocks);

    await deliverReportEmail({
      workspaceId,
      clientId: client.id,
      clientName: client.name,
      recipientEmail: payload.recipientEmail,
      blocks,
      reportName,
      agencyName: workspace?.name,
      workspace,
      reportId: payload.reportId,
      deliveryType: "manual",
      sentBy: user?.id ?? null,
    });

    if (payload.templateId) {
      await recordSentReport({
        workspaceId,
        clientId: client.id,
        templateId: payload.templateId,
        name: reportName,
        blocks,
        reportId: payload.reportId,
      });
      await markTemplateSent(workspaceId, payload.templateId);
    }

    return NextResponse.json({ mode: "sent", client: client.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send report";
    const status = message.includes("Human review") ? 409 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
