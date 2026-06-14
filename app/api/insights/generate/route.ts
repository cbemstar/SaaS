import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { anthropicApiKey } from "@/lib/env";
import { generatedInsightSchema } from "@/lib/ai/insight-schema";
import { getClients, getDailyPerformance, getInsights } from "@/lib/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceId } from "@/lib/workspace";

export async function POST() {
  const [clients, dailyPerformance, existingInsights] = await Promise.all([
    getClients(),
    getDailyPerformance(),
    getInsights(),
  ]);

  if (!anthropicApiKey) {
    return NextResponse.json({ error: "AI insights are not configured" }, { status: 503 });
  }

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    output: Output.object({
      schema: generatedInsightSchema,
      name: "marketing_insight",
      description: "A grounded marketing performance recommendation with cited evidence.",
    }),
    system:
      "You generate client-ready marketing reporting insights. Every recommendation must cite concrete evidence from the supplied metrics and include a human-reviewable action.",
    prompt: JSON.stringify({
      clients: clients.slice(0, 5),
      dailyPerformance: dailyPerformance.slice(-14),
      existingInsights: existingInsights.slice(0, 3),
    }),
  });

  const insight = {
    id: crypto.randomUUID(),
    ...output,
    createdAt: "just now",
  };

  const workspaceId = await requireWorkspaceId();
  const supabase = createSupabaseAdminClient();
  if (supabase && workspaceId) {
    const { error } = await supabase.from("insights").insert({
      workspace_id: workspaceId,
      ...insight,
    });

    if (error) {
      console.error("Failed to store generated insight", error);
    }
  }

  return NextResponse.json({ mode: "generated", insight });
}
