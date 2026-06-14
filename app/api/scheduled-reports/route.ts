import { NextResponse } from "next/server";
import { z } from "zod";
import { blocksForTemplate } from "@/lib/report-blocks";
import { createScheduledReport, listScheduledReports } from "@/lib/scheduled-reports";
import { requireWorkspaceId } from "@/lib/workspace";
import { getReportTemplates } from "@/lib/data";

const scheduleSchema = z.object({
  clientId: z.string().min(1),
  templateId: z.string().min(1),
  recipientEmail: z.string().email(),
  cadence: z.enum(["weekly", "monthly"]),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  sendHour: z.number().int().min(0).max(23).default(8),
  timezone: z.string().min(1).default("Pacific/Auckland"),
  name: z.string().min(1).max(120).optional(),
  blocks: z.array(z.string()).optional(),
});

export async function GET() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await listScheduledReports(workspaceId);
  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof scheduleSchema>;
  try {
    payload = scheduleSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  if (payload.cadence === "weekly" && !payload.dayOfWeek) {
    return NextResponse.json({ error: "Choose a day of the week for weekly schedules" }, { status: 400 });
  }

  if (payload.cadence === "monthly" && !payload.dayOfMonth) {
    return NextResponse.json({ error: "Choose a day of the month for monthly schedules" }, { status: 400 });
  }

  const templates = await getReportTemplates();
  const template = templates.find((item) => item.id === payload.templateId);
  const blocks = payload.blocks ?? blocksForTemplate(template);
  const name = payload.name ?? `${template?.name ?? "Report"} schedule`;

  try {
    const schedule = await createScheduledReport(workspaceId, {
      clientId: payload.clientId,
      templateId: payload.templateId,
      name,
      blocks,
      recipientEmail: payload.recipientEmail,
      cadence: payload.cadence,
      dayOfWeek: payload.dayOfWeek,
      dayOfMonth: payload.dayOfMonth,
      sendHour: payload.sendHour,
      timezone: payload.timezone,
    });
    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
