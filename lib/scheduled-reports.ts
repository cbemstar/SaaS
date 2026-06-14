import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { advanceNextRunAt, computeNextRunAt } from "@/lib/schedule-timing";
import { assertReportDeliveryAllowed } from "@/lib/report-approval";
import { deliverReportEmail, recordSentReport } from "@/lib/report-delivery";
import type { Database, ScheduledReportRow } from "@/lib/supabase/types";

export type ScheduledReportCadence = ScheduledReportRow["cadence"];

export type ScheduledReportView = ScheduledReportRow & {
  clientName?: string;
  templateName?: string;
};

type CreateScheduleInput = {
  clientId: string;
  templateId: string;
  name: string;
  blocks: string[];
  recipientEmail: string;
  cadence: ScheduledReportCadence;
  dayOfWeek?: number;
  dayOfMonth?: number;
  sendHour: number;
  timezone: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listScheduledReports(workspaceId: string): Promise<ScheduledReportView[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("scheduled_reports")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("next_run_at", { ascending: true });

  if (error || !data?.length) return [];

  const clientIds = [...new Set(data.map((row) => row.client_id))];
  const templateIds = [...new Set(data.map((row) => row.template_id))];

  const [{ data: clients }, { data: templates }] = await Promise.all([
    admin.from("clients").select("id, name").eq("workspace_id", workspaceId).in("id", clientIds),
    admin.from("report_templates").select("id, name").eq("workspace_id", workspaceId).in("id", templateIds),
  ]);

  const clientNames = new Map((clients ?? []).map((client) => [client.id, client.name]));
  const templateNames = new Map((templates ?? []).map((template) => [template.id, template.name]));

  return data.map((row) => ({
    ...row,
    clientName: clientNames.get(row.client_id),
    templateName: templateNames.get(row.template_id),
  }));
}

export async function createScheduledReport(workspaceId: string, input: CreateScheduleInput) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const nextRunAt = computeNextRunAt({
    cadence: input.cadence,
    dayOfWeek: input.cadence === "weekly" ? (input.dayOfWeek ?? 1) : null,
    dayOfMonth: input.cadence === "monthly" ? (input.dayOfMonth ?? 1) : null,
    sendHour: input.sendHour,
    timezone: input.timezone,
  });

  const { data, error } = await admin
    .from("scheduled_reports")
    .insert({
      workspace_id: workspaceId,
      client_id: input.clientId,
      template_id: input.templateId,
      name: input.name,
      blocks: input.blocks,
      recipient_email: normalizeEmail(input.recipientEmail),
      cadence: input.cadence,
      day_of_week: input.cadence === "weekly" ? (input.dayOfWeek ?? 1) : null,
      day_of_month: input.cadence === "monthly" ? (input.dayOfMonth ?? 1) : null,
      send_hour: input.sendHour,
      timezone: input.timezone,
      next_run_at: nextRunAt.toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create scheduled report", error);
    throw new Error("Could not create schedule");
  }

  return data;
}

export async function updateScheduledReport(
  workspaceId: string,
  scheduleId: string,
  input: Partial<CreateScheduleInput> & { active?: boolean },
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const { data: existing, error: loadError } = await admin
    .from("scheduled_reports")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", scheduleId)
    .maybeSingle();

  if (loadError || !existing) {
    throw new Error("Schedule not found");
  }

  const cadence = input.cadence ?? existing.cadence;
  const dayOfWeek = cadence === "weekly" ? (input.dayOfWeek ?? existing.day_of_week ?? 1) : null;
  const dayOfMonth = cadence === "monthly" ? (input.dayOfMonth ?? existing.day_of_month ?? 1) : null;
  const sendHour = input.sendHour ?? existing.send_hour;
  const timezone = input.timezone ?? existing.timezone;

  type ScheduledReportUpdate = Database["public"]["Tables"]["scheduled_reports"]["Update"];
  const updates: ScheduledReportUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (input.name) updates.name = input.name;
  if (input.blocks) updates.blocks = input.blocks;
  if (input.recipientEmail) updates.recipient_email = normalizeEmail(input.recipientEmail);
  if (input.active !== undefined) updates.active = input.active;
  if (input.clientId) updates.client_id = input.clientId;
  if (input.templateId) updates.template_id = input.templateId;

  updates.cadence = cadence;
  updates.day_of_week = dayOfWeek;
  updates.day_of_month = dayOfMonth;
  updates.send_hour = sendHour;
  updates.timezone = timezone;

  const timingChanged =
    cadence !== existing.cadence ||
    dayOfWeek !== existing.day_of_week ||
    dayOfMonth !== existing.day_of_month ||
    sendHour !== existing.send_hour ||
    timezone !== existing.timezone;

  if (timingChanged || input.cadence || input.dayOfWeek || input.dayOfMonth || input.sendHour || input.timezone) {
    updates.next_run_at = computeNextRunAt({
      cadence,
      dayOfWeek,
      dayOfMonth,
      sendHour,
      timezone,
    }).toISOString();
  }

  const { data, error } = await admin
    .from("scheduled_reports")
    .update(updates)
    .eq("workspace_id", workspaceId)
    .eq("id", scheduleId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Could not update schedule");
  }

  return data;
}

export async function deleteScheduledReport(workspaceId: string, scheduleId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const { error } = await admin.from("scheduled_reports").delete().eq("workspace_id", workspaceId).eq("id", scheduleId);
  if (error) {
    throw new Error("Could not delete schedule");
  }
}

async function runScheduledReport(row: ScheduledReportRow) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const [{ data: client }, { data: workspace }] = await Promise.all([
    admin.from("clients").select("name").eq("workspace_id", row.workspace_id).eq("id", row.client_id).maybeSingle(),
    admin.from("workspaces").select("*").eq("id", row.workspace_id).maybeSingle(),
  ]);

  if (!client) {
    throw new Error("Client no longer exists");
  }

  const blocks = Array.isArray(row.blocks) ? (row.blocks as string[]) : [];

  await assertReportDeliveryAllowed(workspace, row.workspace_id, row.client_id, blocks);

  await deliverReportEmail({
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    clientName: client.name,
    recipientEmail: row.recipient_email,
    blocks,
    reportName: row.name,
    agencyName: workspace?.name,
    workspace,
    scheduledReportId: row.id,
    deliveryType: "scheduled",
  });

  await recordSentReport({
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    templateId: row.template_id,
    name: row.name,
    blocks,
  });
}

export async function processDueScheduledReports() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const now = new Date().toISOString();
  const { data: dueRows, error } = await admin
    .from("scheduled_reports")
    .select("*")
    .eq("active", true)
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(50);

  if (error) {
    throw error;
  }

  let sent = 0;
  let failed = 0;

  for (const row of dueRows ?? []) {
    try {
      await runScheduledReport(row);
      const nextRunAt = advanceNextRunAt(new Date(row.next_run_at), row.cadence);
      await admin
        .from("scheduled_reports")
        .update({
          last_run_at: new Date().toISOString(),
          last_status: "sent",
          last_error: null,
          next_run_at: nextRunAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      sent += 1;
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Send failed";
      const nextRunAt = advanceNextRunAt(new Date(row.next_run_at), row.cadence);
      await admin
        .from("scheduled_reports")
        .update({
          last_run_at: new Date().toISOString(),
          last_status: "failed",
          last_error: message,
          next_run_at: nextRunAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return { processed: (dueRows ?? []).length, sent, failed };
}
