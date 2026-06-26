import type { Cfg, ComponentType } from "@/components/report-builder/registry";
import { getSourceDef, getHeadlineMetrics, primaryBreakdown, type MetricSource } from "@/lib/metrics/catalog";

export type PresetItem = { type: ComponentType; x: number; y: number; w: number; h: number; config: Cfg };
export type Preset = {
  id: string;
  label: string;
  /** One-line value proposition shown in the gallery. */
  description: string;
  /** Human-readable list of the sources this report draws from. */
  sources: string[];
  items: PresetItem[];
};

const S = (style: Cfg = {}) => ({ style });
const kpi = (x: number, y: number, source: string, metric: string): PresetItem => ({
  type: "kpi", x, y, w: 3, h: 2, config: { source, metric, style: {} },
});
const heading = (y: number, text: string): PresetItem => ({
  type: "heading", x: 0, y, w: 12, h: 1, config: { text, level: "h2", style: {} },
});

/**
 * Out-of-the-box report templates. Each is a complete, opinionated layout that
 * gives the user a valuable starting point (à la SEMrush My Reports) rather than
 * a blank canvas. Cards reference sources the workspace may not have connected —
 * those render an empty hint and can be deleted; the scaffold is the value.
 */
export const PRESETS: Preset[] = [
  {
    id: "marketing-snapshot",
    label: "Marketing Snapshot",
    description: "One-page cross-channel overview — headline numbers from every platform with an AI summary.",
    sources: ["GA4", "Google Ads", "Meta", "Search Console"],
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: S() },
      { type: "ai_summary", x: 0, y: 2, w: 12, h: 3, config: { html: "", style: {} } },
      heading(5, "Headline metrics"),
      kpi(0, 6, "ga4", "sessions"),
      kpi(3, 6, "google_ads", "cost"),
      kpi(6, 6, "meta", "spend"),
      kpi(9, 6, "search_console", "clicks"),
      { type: "chart", x: 0, y: 8, w: 6, h: 4, config: { source: "ga4", metric: "sessions", style: {} } },
      { type: "chart", x: 6, y: 8, w: 6, h: 4, config: { source: "google_ads", metric: "cost", style: {} } },
      { type: "ai_recommendations", x: 0, y: 12, w: 12, h: 3, config: { html: "", style: {} } },
    ],
  },
  {
    id: "monthly-performance",
    label: "Monthly Performance Report",
    description: "The full multi-section client report: website, paid and SEO, with AI commentary on what changed.",
    sources: ["GA4", "Google Ads", "Search Console"],
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: S() },
      { type: "ai_summary", x: 0, y: 2, w: 12, h: 3, config: { html: "", style: {} } },
      heading(5, "Website (GA4)"),
      { type: "metric_grid", x: 0, y: 6, w: 6, h: 3, config: { source: "ga4", metrics: ["sessions", "total_users", "engagement_rate", "key_events"], style: {} } },
      { type: "breakdown", x: 6, y: 6, w: 6, h: 3, config: { source: "ga4", dimension: "channel_group", style: {} } },
      { type: "chart", x: 0, y: 9, w: 12, h: 4, config: { source: "ga4", metric: "sessions", style: {} } },
      heading(13, "Paid (Google Ads)"),
      kpi(0, 14, "google_ads", "cost"),
      kpi(3, 14, "google_ads", "clicks"),
      kpi(6, 14, "google_ads", "conversions"),
      kpi(9, 14, "google_ads", "roas"),
      { type: "breakdown", x: 0, y: 16, w: 12, h: 4, config: { source: "google_ads", dimension: "campaign", style: {} } },
      heading(20, "Search (Search Console)"),
      { type: "breakdown", x: 0, y: 21, w: 6, h: 4, config: { source: "search_console", dimension: "query", style: {} } },
      { type: "breakdown", x: 6, y: 21, w: 6, h: 4, config: { source: "search_console", dimension: "page", style: {} } },
      { type: "ai_whatchanged", x: 0, y: 25, w: 12, h: 3, config: { html: "", style: {} } },
    ],
  },
  {
    id: "paid-media",
    label: "Paid Media Report",
    description: "Ad spend, conversions and ROAS across Google Ads and Meta, with top campaigns and AI highlights.",
    sources: ["Google Ads", "Meta"],
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: S() },
      heading(2, "Google Ads"),
      kpi(0, 3, "google_ads", "cost"),
      kpi(3, 3, "google_ads", "clicks"),
      kpi(6, 3, "google_ads", "conversions"),
      kpi(9, 3, "google_ads", "roas"),
      { type: "chart", x: 0, y: 5, w: 7, h: 4, config: { source: "google_ads", metric: "cost", style: {} } },
      { type: "breakdown", x: 7, y: 5, w: 5, h: 4, config: { source: "google_ads", dimension: "campaign", style: {} } },
      heading(9, "Meta Ads"),
      kpi(0, 10, "meta", "spend"),
      kpi(3, 10, "meta", "impressions"),
      kpi(6, 10, "meta", "clicks"),
      kpi(9, 10, "meta", "conversions"),
      { type: "breakdown", x: 0, y: 12, w: 7, h: 4, config: { source: "meta", dimension: "campaign", style: {} } },
      { type: "ai_highlights", x: 7, y: 12, w: 5, h: 4, config: { html: "", style: {} } },
    ],
  },
  {
    id: "seo-organic",
    label: "SEO & Organic Visibility",
    description: "Search Console clicks, impressions, CTR and positions with top queries/pages, plus GA4 organic engagement.",
    sources: ["Search Console", "GA4"],
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: S() },
      heading(2, "Search visibility"),
      kpi(0, 3, "search_console", "clicks"),
      kpi(3, 3, "search_console", "impressions"),
      kpi(6, 3, "search_console", "ctr"),
      kpi(9, 3, "search_console", "avg_position"),
      { type: "chart", x: 0, y: 5, w: 12, h: 4, config: { source: "search_console", metric: "clicks", style: {} } },
      { type: "breakdown", x: 0, y: 9, w: 6, h: 4, config: { source: "search_console", dimension: "query", style: {} } },
      { type: "breakdown", x: 6, y: 9, w: 6, h: 4, config: { source: "search_console", dimension: "page", style: {} } },
      heading(13, "Organic engagement (GA4)"),
      { type: "kpi", x: 0, y: 14, w: 4, h: 2, config: { source: "ga4", metric: "sessions", style: {} } },
      { type: "kpi", x: 4, y: 14, w: 4, h: 2, config: { source: "ga4", metric: "engagement_rate", style: {} } },
      { type: "kpi", x: 8, y: 14, w: 4, h: 2, config: { source: "ga4", metric: "key_events", style: {} } },
      { type: "ai_recommendations", x: 0, y: 16, w: 12, h: 3, config: { html: "", style: {} } },
    ],
  },
  {
    id: "website-analytics",
    label: "Website Analytics",
    description: "A GA4 deep-dive: users, sessions, engagement and conversions with channel, device and country breakdowns.",
    sources: ["GA4"],
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: S() },
      { type: "ai_summary", x: 0, y: 2, w: 12, h: 3, config: { html: "", style: {} } },
      { type: "metric_grid", x: 0, y: 5, w: 12, h: 3, config: { source: "ga4", metrics: ["sessions", "total_users", "new_users", "engagement_rate", "key_events", "average_session_duration"], style: {} } },
      { type: "chart", x: 0, y: 8, w: 12, h: 4, config: { source: "ga4", metric: "sessions", style: {} } },
      { type: "breakdown", x: 0, y: 12, w: 4, h: 4, config: { source: "ga4", dimension: "channel_group", style: {} } },
      { type: "breakdown", x: 4, y: 12, w: 4, h: 4, config: { source: "ga4", dimension: "device", style: {} } },
      { type: "breakdown", x: 8, y: 12, w: 4, h: 4, config: { source: "ga4", dimension: "country", style: {} } },
    ],
  },
  {
    id: "social-media",
    label: "Social Media Report",
    description: "Reach, engagement and spend across Meta, LinkedIn and TikTok with top campaigns and AI highlights.",
    sources: ["Meta", "LinkedIn", "TikTok"],
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: S() },
      heading(2, "Meta"),
      kpi(0, 3, "meta", "reach"),
      kpi(3, 3, "meta", "impressions"),
      kpi(6, 3, "meta", "clicks"),
      kpi(9, 3, "meta", "spend"),
      { type: "breakdown", x: 0, y: 5, w: 12, h: 3, config: { source: "meta", dimension: "campaign", style: {} } },
      heading(8, "LinkedIn"),
      kpi(0, 9, "linkedin", "impressions"),
      kpi(3, 9, "linkedin", "clicks"),
      kpi(6, 9, "linkedin", "conversions"),
      kpi(9, 9, "linkedin", "spend"),
      heading(11, "TikTok"),
      kpi(0, 12, "tiktok", "video_views"),
      kpi(3, 12, "tiktok", "impressions"),
      kpi(6, 12, "tiktok", "clicks"),
      kpi(9, 12, "tiktok", "spend"),
      { type: "ai_highlights", x: 0, y: 14, w: 12, h: 3, config: { html: "", style: {} } },
    ],
  },
  {
    id: "executive",
    label: "Executive One-Pager",
    description: "A concise leadership view: AI summary, four headline KPIs and a single trend. Nothing more.",
    sources: ["GA4", "Google Ads", "Search Console"],
    items: [
      { type: "client_header", x: 0, y: 0, w: 12, h: 2, config: S() },
      { type: "ai_summary", x: 0, y: 2, w: 12, h: 4, config: { html: "", style: {} } },
      kpi(0, 6, "ga4", "sessions"),
      kpi(3, 6, "ga4", "key_events"),
      kpi(6, 6, "google_ads", "conversions"),
      kpi(9, 6, "search_console", "clicks"),
      { type: "chart", x: 0, y: 8, w: 12, h: 4, config: { source: "ga4", metric: "sessions", style: {} } },
    ],
  },
];

export function getPreset(id: string): Preset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}

/**
 * Build a comprehensive report layout from the sources that actually have data,
 * for the "Create Full Report with AI" action. Each source gets a section
 * (heading + headline metric grid + top breakdown + trend chart); the report is
 * topped and tailed with AI narrative cards (filled in separately).
 */
export function buildAutoReportItems(sources: MetricSource[]): PresetItem[] {
  const items: PresetItem[] = [];
  let y = 0;

  items.push({ type: "client_header", x: 0, y, w: 12, h: 2, config: { style: {} } });
  y += 2;
  items.push({ type: "ai_summary", x: 0, y, w: 12, h: 3, config: { title: "Executive summary", html: "", style: {} } });
  y += 3;

  for (const source of sources) {
    const def = getSourceDef(source);
    if (!def) continue;
    items.push({ type: "heading", x: 0, y, w: 12, h: 1, config: { text: def.label, level: "h2", style: {} } });
    y += 1;
    const headline = getHeadlineMetrics(source, true, 4);
    items.push({ type: "metric_grid", x: 0, y, w: 6, h: 3, config: { source, metrics: headline, style: {} } });
    const bd = primaryBreakdown(source);
    if (bd) {
      items.push({ type: "breakdown", x: 6, y, w: 6, h: 3, config: { source, dimension: bd.dimension.type, style: {} } });
    }
    y += 3;
    items.push({ type: "chart", x: 0, y, w: 12, h: 4, config: { source, metric: def.defaultTrend, chartType: "area", style: {} } });
    y += 4;
  }

  items.push({ type: "ai_whatchanged", x: 0, y, w: 6, h: 3, config: { title: "What changed", html: "", style: {} } });
  items.push({ type: "ai_recommendations", x: 6, y, w: 6, h: 3, config: { title: "Recommendations", html: "", style: {} } });
  return items;
}
