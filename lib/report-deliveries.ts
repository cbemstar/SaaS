import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ReportDeliveryRow } from "@/lib/supabase/types";

export type ReportDeliveryView = {
  id: string;
  clientId: string;
  reportId: string | null;
  recipientEmail: string;
  reportName: string;
  blocks: string[];
  deliveryType: "manual" | "scheduled";
  status: "sent" | "failed";
  errorMessage: string | null;
  sentAt: string;
};

function mapDelivery(row: ReportDeliveryRow): ReportDeliveryView {
  return {
    id: row.id,
    clientId: row.client_id,
    reportId: row.report_id,
    recipientEmail: row.recipient_email,
    reportName: row.report_name,
    blocks: Array.isArray(row.blocks) ? (row.blocks as string[]) : [],
    deliveryType: row.delivery_type,
    status: row.status,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
  };
}

export async function listReportDeliveries(workspaceId: string, clientId?: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  let query = admin
    .from("report_deliveries")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("sent_at", { ascending: false })
    .limit(100);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("Failed to list report deliveries", error);
    return [];
  }

  return data.map(mapDelivery);
}

export async function recordReportDelivery(input: {
  workspaceId: string;
  clientId: string;
  reportId?: string | null;
  scheduledReportId?: string | null;
  recipientEmail: string;
  reportName: string;
  blocks: string[];
  deliveryType: "manual" | "scheduled";
  status: "sent" | "failed";
  errorMessage?: string | null;
  sentBy?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("report_deliveries")
    .insert({
      workspace_id: input.workspaceId,
      client_id: input.clientId,
      report_id: input.reportId ?? null,
      scheduled_report_id: input.scheduledReportId ?? null,
      recipient_email: input.recipientEmail,
      report_name: input.reportName,
      blocks: input.blocks,
      delivery_type: input.deliveryType,
      status: input.status,
      error_message: input.errorMessage ?? null,
      sent_by: input.sentBy ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to record report delivery", error);
    return null;
  }

  if (input.status === "sent") {
    await admin
      .from("clients")
      .update({ lastReport: new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "short" }) })
      .eq("workspace_id", input.workspaceId)
      .eq("id", input.clientId);
  }

  return data.id as string;
}
