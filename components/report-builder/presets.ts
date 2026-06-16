import type { Cfg, ComponentType } from "@/components/report-builder/registry";

export type PresetItem = { type: ComponentType; x: number; y: number; w: number; h: number; config: Cfg };
export type Preset = { id: string; label: string; description: string; items: PresetItem[] };

export const PRESETS: Preset[] = [
  {
    id: "executive",
    label: "Executive summary",
    description: "Header, AI summary, headline KPIs, trend.",
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: { style: {} } },
      { type: "ai_summary", x: 0, y: 2, w: 12, h: 4, config: { html: "", style: {} } },
      { type: "kpi", x: 0, y: 6, w: 3, h: 2, config: { source: "ga4", metric: "sessions", style: {} } },
      { type: "kpi", x: 3, y: 6, w: 3, h: 2, config: { source: "ga4", metric: "total_users", style: {} } },
      { type: "kpi", x: 6, y: 6, w: 3, h: 2, config: { source: "ga4", metric: "key_events", style: {} } },
      { type: "kpi", x: 9, y: 6, w: 3, h: 2, config: { source: "ga4", metric: "engagement_rate", style: {} } },
      { type: "chart", x: 0, y: 8, w: 12, h: 4, config: { source: "ga4", metric: "sessions", style: {} } },
    ],
  },
  {
    id: "ga4_seo",
    label: "Website / SEO report",
    description: "GA4 + Search Console performance with breakdowns.",
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: { style: {} } },
      { type: "metric_grid", x: 0, y: 2, w: 12, h: 3, config: { source: "ga4", metrics: ["sessions", "total_users", "engagement_rate", "key_events"], style: {} } },
      { type: "chart", x: 0, y: 5, w: 7, h: 4, config: { source: "ga4", metric: "sessions", style: {} } },
      { type: "breakdown", x: 7, y: 5, w: 5, h: 4, config: { source: "ga4", dimension: "channel_group", style: {} } },
      { type: "breakdown", x: 0, y: 9, w: 6, h: 4, config: { source: "search_console", dimension: "query", style: {} } },
      { type: "ai_recommendations", x: 6, y: 9, w: 6, h: 4, config: { html: "", style: {} } },
    ],
  },
  {
    id: "paid",
    label: "Paid media report",
    description: "Google Ads spend, conversions, campaigns + highlights.",
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: { style: {} } },
      { type: "kpi", x: 0, y: 2, w: 3, h: 2, config: { source: "google_ads", metric: "cost", style: {} } },
      { type: "kpi", x: 3, y: 2, w: 3, h: 2, config: { source: "google_ads", metric: "clicks", style: {} } },
      { type: "kpi", x: 6, y: 2, w: 3, h: 2, config: { source: "google_ads", metric: "conversions", style: {} } },
      { type: "kpi", x: 9, y: 2, w: 3, h: 2, config: { source: "google_ads", metric: "roas", style: {} } },
      { type: "chart", x: 0, y: 4, w: 7, h: 4, config: { source: "google_ads", metric: "cost", style: {} } },
      { type: "breakdown", x: 7, y: 4, w: 5, h: 4, config: { source: "google_ads", dimension: "campaign", style: {} } },
      { type: "ai_highlights", x: 0, y: 8, w: 12, h: 3, config: { html: "", style: {} } },
    ],
  },
];
