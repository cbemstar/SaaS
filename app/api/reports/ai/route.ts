import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireWorkspaceId, getActiveWorkspace } from "@/lib/workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReportData } from "@/lib/report-builder/report-data";
import { anthropicApiKey } from "@/lib/env";
import { deltaPercent, formatMetric, getSourceDef, type MetricSource } from "@/lib/metrics/catalog";

const bodySchema = z.object({
  clientId: z.string().min(1),
  days: z.number().int().min(1).max(3650).default(30),
  kind: z.enum(["summary", "recommendations", "highlights", "whatchanged"]),
});

const INSTRUCTIONS: Record<z.infer<typeof bodySchema>["kind"], string> = {
  summary:
    "Write a concise executive summary of this client's marketing performance for the period (2-3 short paragraphs). Lead with the headline result, reference the most important metrics and their change vs the previous period, and keep it client-friendly.",
  recommendations:
    "Give 3-5 specific, actionable recommendations to improve performance next period, grounded in the data below. Return a <ul> list; each <li> is one concrete recommendation.",
  highlights:
    "List the 3-5 most notable changes this period (biggest wins, drops, or anomalies) as a <ul> list of short bullets, each citing the metric and its change.",
  whatchanged:
    "Summarise what changed versus the previous period in 1-2 short paragraphs — call out the metrics that moved most and likely implications.",
};

export async function POST(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)" }, { status: 503 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const workspace = await getActiveWorkspace();
  const currency = workspace?.currency ?? "NZD";

  const { data: client } = admin
    ? await admin.from("clients").select("name").eq("workspace_id", workspaceId).eq("id", body.clientId).maybeSingle()
    : { data: null };
  const clientName = client?.name ?? "the client";

  const reportData = await getReportData(workspaceId, body.clientId, clientName, currency, body.days, admin ?? undefined);
  if (!reportData.availableSources.length) {
    return NextResponse.json({ error: "No data for this client yet — sync or load sample data first." }, { status: 400 });
  }

  const dataSummary = reportData.availableSources
    .map((source) => {
      const def = getSourceDef(source as MetricSource);
      const sd = reportData.sources[source as MetricSource];
      if (!def || !sd) return null;
      const parts = def.metrics
        .filter((m) => !m.hidden)
        .slice(0, 8)
        .map((m) => {
          const cur = sd.totals[m.key] ?? 0;
          const prev = sd.previousTotals[m.key] ?? 0;
          const d = deltaPercent(cur, prev);
          const delta = d !== null ? ` (${d >= 0 ? "+" : ""}${d.toFixed(1)}% vs prev)` : "";
          return `${m.label}: ${formatMetric(source as MetricSource, m.key, cur, currency)}${delta}`;
        });
      return `${def.label} — ${parts.join("; ")}`;
    })
    .filter(Boolean)
    .join("\n");

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: `${INSTRUCTIONS[body.kind]}\n\nClient: ${clientName}\nPeriod: last ${body.days} days\n\nData:\n${dataSummary}\n\nReturn clean semantic HTML using only <p>, <strong>, <em>, <ul> and <li>. No markdown, no headings, no preamble or sign-off.`,
    });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Report AI generation failed", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
