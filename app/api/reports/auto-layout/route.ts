import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { requireWorkspaceId, getActiveWorkspace } from "@/lib/workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReportData } from "@/lib/report-builder/report-data";
import { resolveAiModel } from "@/lib/ai/provider";
import { checkAiCredit, recordAiUsage } from "@/lib/ai/usage";
import { enforceRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { deltaPercent, formatMetric, getMetricDef, getSourceDef, type MetricSource } from "@/lib/metrics/catalog";

const bodySchema = z.object({
  clientId: z.string().min(1),
  days: z.number().int().min(1).max(3650).default(30),
});

// The component vocabulary the planner may use. Maps to registry component types.
const BLOCK_TYPES = [
  "section_heading",
  "kpi",
  "metric_grid",
  "chart",
  "combo",
  "stacked",
  "scatter",
  "pie",
  "table",
  "breakdown",
  "geo",
  "ai_summary",
  "ai_whatchanged",
  "ai_highlights",
  "ai_recommendations",
] as const;

const planSchema = z.object({
  title: z.string(),
  blocks: z
    .array(
      z.object({
        type: z.enum(BLOCK_TYPES),
        heading: z.string().optional(),
        source: z.string().optional(),
        metric: z.string().optional(),
        metrics: z.array(z.string()).optional(),
        dimension: z.string().optional(),
        chartType: z.enum(["area", "line", "bar"]).optional(),
      }),
    )
    .max(48),
});

export async function POST(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await enforceRateLimit(RATE_LIMITS.ai, workspaceId);
  if (!rl.success) return rateLimitResponse(rl);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const workspace = await getActiveWorkspace();
  const resolved = resolveAiModel(workspace);
  if (!resolved) {
    return NextResponse.json(
      { error: "AI is not configured. Add your own API key in Settings → AI to enable it." },
      { status: 503 },
    );
  }

  const { allowed, usage } = await checkAiCredit(workspaceId, workspace);
  if (!allowed) {
    return NextResponse.json(
      { error: `You've used all ${usage.limit} AI credits on the ${usage.plan} plan this month.`, usage },
      { status: 402 },
    );
  }

  const admin = createSupabaseAdminClient();
  const currency = workspace?.currency ?? "NZD";
  const { data: client } = admin
    ? await admin.from("clients").select("name").eq("workspace_id", workspaceId).eq("id", body.clientId).maybeSingle()
    : { data: null };
  const clientName = client?.name ?? "the client";

  const reportData = await getReportData(workspaceId, body.clientId, clientName, currency, body.days, admin ?? undefined);
  if (!reportData.availableSources.length) {
    return NextResponse.json({ error: "No data for this client yet — sync or load sample data first." }, { status: 400 });
  }

  // Build a precise data brief: per source, the exact metric/dimension keys the
  // planner is allowed to use, with current values + deltas so it can reason.
  const brief = reportData.availableSources
    .map((source) => {
      const def = getSourceDef(source as MetricSource);
      const sd = reportData.sources[source as MetricSource];
      if (!def || !sd) return null;
      const metrics = def.metrics
        .filter((m) => !m.hidden)
        .map((m) => {
          const cur = sd.totals[m.key] ?? 0;
          const prev = sd.previousTotals[m.key] ?? 0;
          const d = deltaPercent(cur, prev);
          const delta = d !== null ? ` (${d >= 0 ? "+" : ""}${d.toFixed(1)}%)` : "";
          return `${m.key}=${formatMetric(source as MetricSource, m.key, cur, currency)}${delta}`;
        })
        .join(", ");
      const dims = def.dimensions.map((dm) => dm.type).join(", ");
      return [
        `SOURCE ${source} (${def.label})`,
        `  metricKeys: ${def.metrics.filter((m) => !m.hidden).map((m) => m.key).join(", ")}`,
        `  dimensionKeys: ${dims}`,
        `  breakdownMetricKeys: ${def.breakdownMetrics.join(", ")}`,
        `  current: ${metrics}`,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  const system = [
    "You are a senior marketing analytics consultant with an MBA. You design client performance reports that drive real business decisions.",
    "Given the available data, output an ORDERED list of report blocks that tells a clear, executive-ready story.",
    "Principles:",
    "- Open with a client_header is added automatically; you start with an ai_summary (executive summary).",
    "- Organise by funnel / channel; add a section_heading before each themed section.",
    "- Choose the visualization that best fits each data story: trend over time → chart (line/area) or combo (bar+line for spend vs conversions); composition/share → pie or stacked; comparison across items → bar chart or breakdown/table; efficiency/correlation (e.g. cost vs conversions) → scatter; geography → geo; single number → kpi; several numbers → metric_grid; detailed tabular data → table.",
    "- Lead each section with the metrics that matter for ROI and growth; surface anomalies and efficiency (CPA, ROAS, CTR, conversion rate, engagement).",
    "- Use ai_whatchanged and ai_recommendations near the end to interpret the data and recommend actions. Optionally ai_highlights.",
    "- ONLY use the exact source/metric/dimension keys provided. For kpi/chart use `metric`; metric_grid/table use `metrics` (3-6); combo uses metrics=[barMetric,lineMetric]; scatter uses dimension + metrics=[xMetric,yMetric]; pie/stacked use dimension + metric; breakdown/geo use source (+dimension for breakdown).",
    "- Give every data block a short, business-friendly `heading`. Be comprehensive but avoid redundant blocks. 20-40 blocks is typical for multi-source data.",
  ].join("\n");

  let plan: z.infer<typeof planSchema>;
  try {
    const result = await generateObject({
      model: resolved.model,
      schema: planSchema,
      schemaName: "report_plan",
      schemaDescription: "An ordered list of report blocks forming an expert marketing performance report.",
      system,
      prompt: `Client: ${clientName}\nPeriod: last ${body.days} days\n\nAvailable data:\n${brief}\n\nDesign the report now.`,
    });
    plan = result.object;
  } catch (error) {
    console.error("Auto-layout generation failed", error);
    return NextResponse.json({ error: "Could not plan the report. Please try again." }, { status: 500 });
  }

  // Validate every block against the real catalog; drop anything invalid so the
  // client only ever receives buildable blocks.
  const validSources = new Set(reportData.availableSources);
  const isMetric = (s: string, k?: string) => Boolean(k && getMetricDef(s as MetricSource, k));
  const isDim = (s: string, k?: string) => Boolean(k && getSourceDef(s as MetricSource)?.dimensions.some((d) => d.type === k));
  const firstDim = (s: string) => getSourceDef(s as MetricSource)?.dimensions[0]?.type;
  const breakdownMetric = (s: string) => getSourceDef(s as MetricSource)?.breakdownMetrics[0];

  const blocks = plan.blocks.filter((b) => {
    if (b.type === "section_heading") return Boolean(b.heading);
    if (b.type.startsWith("ai_")) return true;
    if (!b.source || !validSources.has(b.source as MetricSource)) return false;
    if (b.type === "geo") return isDim(b.source, "country");
    if (b.type === "breakdown") return true;
    if (b.type === "pie" || b.type === "stacked") return true;
    if (b.type === "kpi" || b.type === "chart") return isMetric(b.source, b.metric);
    if (b.type === "metric_grid" || b.type === "table") return (b.metrics ?? []).some((m) => isMetric(b.source!, m));
    if (b.type === "combo" || b.type === "scatter") return (b.metrics ?? []).filter((m) => isMetric(b.source!, m)).length >= 2;
    return false;
  }).map((b) => {
    // Backfill sensible dimensions/metrics where the planner omitted them.
    if (b.source && (b.type === "breakdown" || b.type === "pie" || b.type === "stacked" || b.type === "scatter")) {
      if (!isDim(b.source, b.dimension)) b.dimension = firstDim(b.source);
    }
    if (b.source && (b.type === "pie" || b.type === "stacked") && !isMetric(b.source, b.metric)) {
      b.metric = breakdownMetric(b.source);
    }
    return b;
  });

  await recordAiUsage(workspaceId, workspace);
  return NextResponse.json({ title: plan.title, blocks });
}
