import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { generatedInsightSchema, type GeneratedInsight } from "@/lib/ai/insight-schema";
import { getClients, getDailyPerformance, getInsights } from "@/lib/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceId, getActiveWorkspace } from "@/lib/workspace";
import { resolveAiModel } from "@/lib/ai/provider";
import { checkAiCredit, recordAiUsage } from "@/lib/ai/usage";
import { enforceRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST() {
  // Authenticate first — never spend AI tokens for an unauthenticated caller.
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Throttle expensive generations per workspace (defence-in-depth alongside credits).
  const rl = await enforceRateLimit(RATE_LIMITS.ai, workspaceId);
  if (!rl.success) {
    return rateLimitResponse(rl);
  }

  const workspace = await getActiveWorkspace();
  const resolved = resolveAiModel(workspace);
  if (!resolved) {
    return NextResponse.json(
      { error: "AI is not configured. Add your own API key in Settings → AI to enable it." },
      { status: 503 },
    );
  }

  // Metered (non-BYOK) workspaces must have credits left this month.
  const { allowed, usage } = await checkAiCredit(workspaceId, workspace);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${usage.limit} AI credits on the ${usage.plan} plan this month. Upgrade your plan or add your own API key in Settings → AI.`,
        usage,
      },
      { status: 402 },
    );
  }

  const [clients, dailyPerformance, existingInsights] = await Promise.all([
    getClients(),
    getDailyPerformance(),
    getInsights(),
  ]);

  if (!clients.length) {
    return NextResponse.json(
      { error: "Add a client and sync (or load sample data) before generating insights." },
      { status: 400 },
    );
  }

  let output: GeneratedInsight;
  try {
    const result = await generateObject({
      model: resolved.model,
      schema: generatedInsightSchema,
      schemaName: "marketing_insight",
      schemaDescription: "A grounded marketing performance recommendation with cited evidence.",
      system:
        "You generate client-ready marketing reporting insights. Every recommendation must cite concrete evidence from the supplied metrics and include a human-reviewable action.",
      prompt: JSON.stringify({
        clients: clients.slice(0, 5),
        dailyPerformance: dailyPerformance.slice(-14),
        existingInsights: existingInsights.slice(0, 3),
      }),
    });
    output = result.object;
  } catch (error) {
    console.error("Insight generation failed", error);
    return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 500 });
  }

  const insight = {
    id: crypto.randomUUID(),
    ...output,
    createdAt: "just now",
  };

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from("insights").insert({
      workspace_id: workspaceId,
      ...insight,
    });
    if (error) {
      console.error("Failed to store generated insight", error);
      return NextResponse.json({ error: "Could not save the generated insight." }, { status: 500 });
    }
  }

  // Count the credit only after a successful generation (no-op for BYOK).
  await recordAiUsage(workspaceId, workspace);

  return NextResponse.json({ mode: "generated", insight });
}
