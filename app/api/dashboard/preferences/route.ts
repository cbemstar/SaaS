import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceId } from "@/lib/workspace";
import { getDashboardLayout, saveDashboardLayout } from "@/lib/dashboard-preferences";
import { ga4MetricKeys } from "@/lib/ga4-aggregate";
import type { DashboardLayout } from "@/lib/ga4-aggregate";

const metricKey = z.enum(ga4MetricKeys as unknown as [string, ...string[]]);

const layoutSchema = z.object({
  cards: z
    .array(z.object({ metric: metricKey, size: z.enum(["sm", "md", "lg"]) }))
    .max(24),
  trendMetric: metricKey,
  days: z.number().int().min(1).max(365),
  filter: z
    .object({
      dimensionType: z.enum(["channel_group", "device", "country", "landing_page"]),
      value: z.string().max(512),
    })
    .nullable(),
});

const bodySchema = z.object({
  scope: z.string().min(1).max(128),
  layout: layoutSchema,
});

export async function GET(request: Request) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = new URL(request.url).searchParams.get("scope") ?? "overview";
  const layout = await getDashboardLayout(workspaceId, scope);
  return NextResponse.json({ layout });
}

export async function PUT(request: Request) {
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

  try {
    await saveDashboardLayout(workspaceId, body.scope, body.layout as DashboardLayout);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save layout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
