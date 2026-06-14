import { z } from "zod";

export const generatedInsightSchema = z.object({
  client: z.string(),
  clientId: z.string(),
  channel: z.enum(["meta", "google_ads", "linkedin", "tiktok", "ga4", "search_console"]),
  severity: z.enum(["high", "medium", "low"]),
  type: z.enum(["opportunity", "anomaly", "recommendation"]),
  title: z.string(),
  body: z.string(),
  action: z.string(),
  evidence: z.string(),
  estImpact: z.string(),
});

export type GeneratedInsight = z.infer<typeof generatedInsightSchema>;
