// Source-agnostic metric catalog. Every connector describes its metrics here:
// label, display format, whether it sums across days (additive) or is derived
// from sums (rates/ratios). This drives ingestion, aggregation, and display
// uniformly across all sources, so dashboards/reports treat GA4, Meta, LinkedIn,
// etc. the same way.

export type MetricSource = "ga4" | "meta" | "google_ads" | "linkedin" | "tiktok" | "search_console";

export type MetricFormat = "number" | "percent" | "decimal" | "duration" | "currency";

export type CardSize = "sm" | "md" | "lg";

export type MetricDef = {
  key: string;
  label: string;
  short: string;
  format: MetricFormat;
  higherIsBetter: boolean;
  /** true = sum across days; false = derived from other metrics via `derive`. */
  additive: boolean;
  /** For derived metrics: compute from a totals record of additive metrics. */
  derive?: (totals: Record<string, number>) => number;
  ecommerce?: boolean;
  /** Stored + used in derivations but not shown as a pickable card/trend (e.g. weighting helpers). */
  hidden?: boolean;
};

export type DimensionDef = {
  type: string;
  label: string;
  filterable: boolean;
};

export type SourceDef = {
  key: MetricSource;
  label: string;
  /** Short label for the source switcher. */
  short: string;
  metrics: MetricDef[];
  dimensions: DimensionDef[];
  /** Metric keys carried on breakdown rows (the filterable subset). */
  breakdownMetrics: string[];
  defaultCards: Array<{ metric: string; size: CardSize }>;
  defaultTrend: string;
};

// --- GA4 ---------------------------------------------------------------------

const GA4: SourceDef = {
  key: "ga4",
  label: "Website (GA4)",
  short: "Website",
  metrics: [
    { key: "total_users", label: "Total users", short: "Users", format: "number", higherIsBetter: true, additive: true },
    { key: "new_users", label: "New users", short: "New users", format: "number", higherIsBetter: true, additive: true },
    { key: "active_users", label: "Active users", short: "Active", format: "number", higherIsBetter: true, additive: true },
    { key: "sessions", label: "Sessions", short: "Sessions", format: "number", higherIsBetter: true, additive: true },
    { key: "engaged_sessions", label: "Engaged sessions", short: "Engaged", format: "number", higherIsBetter: true, additive: true },
    { key: "screen_page_views", label: "Page views", short: "Views", format: "number", higherIsBetter: true, additive: true },
    { key: "event_count", label: "Events", short: "Events", format: "number", higherIsBetter: true, additive: true },
    { key: "key_events", label: "Key events", short: "Key events", format: "number", higherIsBetter: true, additive: true },
    { key: "user_engagement_duration", label: "Total engagement time", short: "Engmt. time", format: "duration", higherIsBetter: true, additive: true },
    { key: "total_revenue", label: "Total revenue", short: "Revenue", format: "currency", higherIsBetter: true, additive: true, ecommerce: true },
    { key: "transactions", label: "Transactions", short: "Txns", format: "number", higherIsBetter: true, additive: true, ecommerce: true },
    { key: "purchase_revenue", label: "Purchase revenue", short: "Purch. rev.", format: "currency", higherIsBetter: true, additive: true, ecommerce: true },
    { key: "engagement_rate", label: "Engagement rate", short: "Engagement", format: "percent", higherIsBetter: true, additive: false, derive: (t) => (t.sessions > 0 ? t.engaged_sessions / t.sessions : 0) },
    { key: "bounce_rate", label: "Bounce rate", short: "Bounce", format: "percent", higherIsBetter: false, additive: false, derive: (t) => (t.sessions > 0 ? 1 - t.engaged_sessions / t.sessions : 0) },
    { key: "sessions_per_user", label: "Sessions per user", short: "Sess./user", format: "decimal", higherIsBetter: true, additive: false, derive: (t) => (t.total_users > 0 ? t.sessions / t.total_users : 0) },
    { key: "views_per_session", label: "Views per session", short: "Views/sess.", format: "decimal", higherIsBetter: true, additive: false, derive: (t) => (t.sessions > 0 ? t.screen_page_views / t.sessions : 0) },
    { key: "average_session_duration", label: "Avg. engagement / session", short: "Avg. time", format: "duration", higherIsBetter: true, additive: false, derive: (t) => (t.sessions > 0 ? t.user_engagement_duration / t.sessions : 0) },
  ],
  dimensions: [
    { type: "channel_group", label: "Channel", filterable: true },
    { type: "device", label: "Device", filterable: true },
    { type: "country", label: "Country", filterable: true },
    { type: "landing_page", label: "Landing page", filterable: false },
  ],
  breakdownMetrics: ["sessions", "total_users", "engaged_sessions", "key_events", "screen_page_views"],
  defaultCards: [
    { metric: "total_users", size: "sm" },
    { metric: "sessions", size: "sm" },
    { metric: "engagement_rate", size: "sm" },
    { metric: "key_events", size: "sm" },
    { metric: "new_users", size: "sm" },
    { metric: "screen_page_views", size: "sm" },
    { metric: "average_session_duration", size: "sm" },
    { metric: "bounce_rate", size: "sm" },
  ],
  defaultTrend: "sessions",
};

// --- Search Console ----------------------------------------------------------

const SEARCH_CONSOLE: SourceDef = {
  key: "search_console",
  label: "Search Console",
  short: "Search",
  metrics: [
    { key: "clicks", label: "Clicks", short: "Clicks", format: "number", higherIsBetter: true, additive: true },
    { key: "impressions", label: "Impressions", short: "Impr.", format: "number", higherIsBetter: true, additive: true },
    // Impression-weighted position sum; hidden, used to derive average position correctly.
    { key: "position_weight", label: "Position weight", short: "Pos. wt", format: "decimal", higherIsBetter: false, additive: true, hidden: true },
    { key: "ctr", label: "CTR", short: "CTR", format: "percent", higherIsBetter: true, additive: false, derive: (t) => (t.impressions > 0 ? t.clicks / t.impressions : 0) },
    { key: "avg_position", label: "Avg. position", short: "Position", format: "decimal", higherIsBetter: false, additive: false, derive: (t) => (t.impressions > 0 ? t.position_weight / t.impressions : 0) },
  ],
  dimensions: [
    { type: "query", label: "Query", filterable: false },
    { type: "page", label: "Page", filterable: false },
    { type: "country", label: "Country", filterable: true },
    { type: "device", label: "Device", filterable: true },
  ],
  breakdownMetrics: ["clicks", "impressions"],
  defaultCards: [
    { metric: "clicks", size: "sm" },
    { metric: "impressions", size: "sm" },
    { metric: "ctr", size: "sm" },
    { metric: "avg_position", size: "sm" },
  ],
  defaultTrend: "clicks",
};

// --- Google Ads --------------------------------------------------------------

const GOOGLE_ADS: SourceDef = {
  key: "google_ads",
  label: "Google Ads",
  short: "Google Ads",
  metrics: [
    { key: "cost", label: "Cost", short: "Cost", format: "currency", higherIsBetter: false, additive: true },
    { key: "impressions", label: "Impressions", short: "Impr.", format: "number", higherIsBetter: true, additive: true },
    { key: "clicks", label: "Clicks", short: "Clicks", format: "number", higherIsBetter: true, additive: true },
    { key: "conversions", label: "Conversions", short: "Conv.", format: "number", higherIsBetter: true, additive: true },
    { key: "conversions_value", label: "Conversion value", short: "Conv. val.", format: "currency", higherIsBetter: true, additive: true },
    { key: "ctr", label: "CTR", short: "CTR", format: "percent", higherIsBetter: true, additive: false, derive: (t) => (t.impressions > 0 ? t.clicks / t.impressions : 0) },
    { key: "cpc", label: "Avg. CPC", short: "CPC", format: "currency", higherIsBetter: false, additive: false, derive: (t) => (t.clicks > 0 ? t.cost / t.clicks : 0) },
    { key: "cpa", label: "Cost / conv.", short: "CPA", format: "currency", higherIsBetter: false, additive: false, derive: (t) => (t.conversions > 0 ? t.cost / t.conversions : 0) },
    { key: "conversion_rate", label: "Conv. rate", short: "CvR", format: "percent", higherIsBetter: true, additive: false, derive: (t) => (t.clicks > 0 ? t.conversions / t.clicks : 0) },
    { key: "roas", label: "ROAS", short: "ROAS", format: "decimal", higherIsBetter: true, additive: false, derive: (t) => (t.cost > 0 ? t.conversions_value / t.cost : 0) },
  ],
  dimensions: [
    { type: "campaign", label: "Campaign", filterable: true },
    { type: "device", label: "Device", filterable: true },
  ],
  breakdownMetrics: ["cost", "impressions", "clicks", "conversions"],
  defaultCards: [
    { metric: "cost", size: "sm" },
    { metric: "clicks", size: "sm" },
    { metric: "conversions", size: "sm" },
    { metric: "ctr", size: "sm" },
    { metric: "impressions", size: "sm" },
    { metric: "cpc", size: "sm" },
    { metric: "cpa", size: "sm" },
    { metric: "roas", size: "sm" },
  ],
  defaultTrend: "cost",
};

// --- Paid social (Meta / LinkedIn / TikTok) ----------------------------------

const ctr = (t: Record<string, number>) => (t.impressions > 0 ? t.clicks / t.impressions : 0);
const cpc = (t: Record<string, number>) => (t.clicks > 0 ? t.spend / t.clicks : 0);
const cpa = (t: Record<string, number>) => (t.conversions > 0 ? t.spend / t.conversions : 0);
const cpm = (t: Record<string, number>) => (t.impressions > 0 ? (t.spend / t.impressions) * 1000 : 0);

function paidSocial(
  key: MetricSource,
  label: string,
  short: string,
  extras: MetricDef[] = [],
  extraDefaultCards: Array<{ metric: string; size: CardSize }> = [],
): SourceDef {
  return {
    key,
    label,
    short,
    metrics: [
      { key: "spend", label: "Spend", short: "Spend", format: "currency", higherIsBetter: false, additive: true },
      { key: "impressions", label: "Impressions", short: "Impr.", format: "number", higherIsBetter: true, additive: true },
      { key: "clicks", label: "Clicks", short: "Clicks", format: "number", higherIsBetter: true, additive: true },
      { key: "conversions", label: "Conversions", short: "Conv.", format: "number", higherIsBetter: true, additive: true },
      ...extras,
      { key: "ctr", label: "CTR", short: "CTR", format: "percent", higherIsBetter: true, additive: false, derive: ctr },
      { key: "cpc", label: "Avg. CPC", short: "CPC", format: "currency", higherIsBetter: false, additive: false, derive: cpc },
      { key: "cpm", label: "CPM", short: "CPM", format: "currency", higherIsBetter: false, additive: false, derive: cpm },
      { key: "cpa", label: "Cost / conv.", short: "CPA", format: "currency", higherIsBetter: false, additive: false, derive: cpa },
    ],
    dimensions: [
      { type: "campaign", label: "Campaign", filterable: true },
      { type: "device", label: "Device", filterable: true },
    ],
    breakdownMetrics: ["spend", "impressions", "clicks", "conversions"],
    defaultCards: [
      { metric: "spend", size: "sm" },
      { metric: "impressions", size: "sm" },
      { metric: "clicks", size: "sm" },
      { metric: "ctr", size: "sm" },
      ...extraDefaultCards,
      { metric: "conversions", size: "sm" },
      { metric: "cpc", size: "sm" },
      { metric: "cpa", size: "sm" },
    ],
    defaultTrend: "spend",
  };
}

const META = paidSocial("meta", "Meta Ads", "Meta", [
  { key: "reach", label: "Reach", short: "Reach", format: "number", higherIsBetter: true, additive: true },
]);
const LINKEDIN = paidSocial("linkedin", "LinkedIn Ads", "LinkedIn");
const TIKTOK = paidSocial(
  "tiktok",
  "TikTok Ads",
  "TikTok",
  [{ key: "video_views", label: "Video views", short: "Views", format: "number", higherIsBetter: true, additive: true }],
  [{ metric: "video_views", size: "sm" }],
);

export const SOURCES: Record<MetricSource, SourceDef | undefined> = {
  ga4: GA4,
  meta: META,
  google_ads: GOOGLE_ADS,
  linkedin: LINKEDIN,
  tiktok: TIKTOK,
  search_console: SEARCH_CONSOLE,
};

export function getSourceDef(source: MetricSource): SourceDef | null {
  return SOURCES[source] ?? null;
}

export function getMetricDef(source: MetricSource, key: string): MetricDef | null {
  return getSourceDef(source)?.metrics.find((m) => m.key === key) ?? null;
}

export function additiveKeys(source: MetricSource): string[] {
  return getSourceDef(source)?.metrics.filter((m) => m.additive).map((m) => m.key) ?? [];
}

/**
 * The handful of headline metrics to surface for a source in compact summaries
 * (e.g. the all-sources dashboard overview). Derived from the source's curated
 * defaultCards, skipping hidden metrics and ecommerce-only metrics when the
 * workspace has no ecommerce data.
 */
export function getHeadlineMetrics(source: MetricSource, showEcommerce: boolean, max = 4): string[] {
  const def = getSourceDef(source);
  if (!def) return [];
  const out: string[] = [];
  for (const card of def.defaultCards) {
    if (out.includes(card.metric)) continue;
    const m = getMetricDef(source, card.metric);
    if (!m || m.hidden) continue;
    if (m.ecommerce && !showEcommerce) continue;
    out.push(card.metric);
    if (out.length >= max) break;
  }
  return out;
}

/** The dimension + metric to use for a source's compact "top rows" table. */
export function primaryBreakdown(source: MetricSource): { dimension: DimensionDef; metric: string } | null {
  const def = getSourceDef(source);
  if (!def) return null;
  const dimension = def.dimensions.find((d) => d.filterable) ?? def.dimensions[0];
  const metric = def.breakdownMetrics[0];
  if (!dimension || !metric) return null;
  return { dimension, metric };
}

// --- Formatting --------------------------------------------------------------

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatMetric(source: MetricSource, key: string, value: number, currency = "NZD"): string {
  const def = getMetricDef(source, key);
  switch (def?.format) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "decimal":
      return value.toFixed(2);
    case "duration":
      return formatDuration(value);
    case "currency":
      return new Intl.NumberFormat("en-NZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
    default:
      return new Intl.NumberFormat("en-NZ", {
        notation: value >= 100000 ? "compact" : "standard",
        maximumFractionDigits: value >= 100000 ? 1 : 0,
      }).format(value);
  }
}

export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

// --- Shared data shapes + aggregation (client-safe, no DB) -------------------

export type MetricTotals = Record<string, number>;
export type DailyPoint = { date: string; label: string; metrics: MetricTotals };

/** What a connector's rich fetch returns, ready for the metric store. */
export type SourceMetricsResult = {
  daily: Array<{ date: string; metrics: MetricTotals }>;
  breakdowns: Array<{ date: string; dimension_type: string; dimension_value: string; metrics: MetricTotals }>;
};
export type Scope = "overview" | { clientId: string };
export type MetricFilter = { dimensionType: string; value: string } | null;

export type BreakdownRaw = {
  date: string;
  dimension_type: string;
  dimension_value: string;
  metrics: MetricTotals;
};

export type CompareMode = "none" | "previous" | "year";

export type DashboardLayout = {
  cards: Array<{ metric: string; size: CardSize }>;
  trendMetric: string;
  days: number;
  /** Optional explicit custom range (overrides `days`). */
  rangeStart?: string;
  rangeEnd?: string;
  compare?: CompareMode;
  filter: MetricFilter;
};

export function defaultLayout(source: MetricSource): DashboardLayout {
  const def = getSourceDef(source);
  return {
    cards: def?.defaultCards ?? [],
    trendMetric: def?.defaultTrend ?? "",
    days: 30,
    compare: "none",
    filter: null,
  };
}

export function emptyTotals(source: MetricSource): MetricTotals {
  const totals: MetricTotals = {};
  for (const metric of getSourceDef(source)?.metrics ?? []) totals[metric.key] = 0;
  return totals;
}

export function applyDerived(source: MetricSource, totals: MetricTotals): MetricTotals {
  for (const metric of getSourceDef(source)?.metrics ?? []) {
    if (!metric.additive && metric.derive) totals[metric.key] = metric.derive(totals);
  }
  return totals;
}

export function aggregateTotals(source: MetricSource, points: Array<Partial<MetricTotals>>): MetricTotals {
  const totals = emptyTotals(source);
  for (const point of points) {
    for (const key of additiveKeys(source)) totals[key] += point[key] ?? 0;
  }
  return applyDerived(source, totals);
}

export function formatDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function addDays(date: string, delta: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function addYears(date: string, delta: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setFullYear(d.getFullYear() + delta);
  return d.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86400000) + 1;
}

export type RangeSpec = { days: number; rangeStart?: string; rangeEnd?: string; compare?: CompareMode };

/**
 * Resolves the current window and the comparison window (previous period or
 * previous year) from a range spec, anchored to the latest available date.
 */
export function resolveWindows(points: DailyPoint[], spec: RangeSpec) {
  if (!points.length) return { current: [] as DailyPoint[], previous: [] as DailyPoint[], start: "", end: "" };
  const anchor = points[points.length - 1].date;
  const end = spec.rangeEnd ?? anchor;
  const start = spec.rangeStart ?? addDays(end, -(spec.days - 1));
  const within = (p: DailyPoint, s: string, e: string) => p.date >= s && p.date <= e;
  const current = points.filter((p) => within(p, start, end));

  let previous: DailyPoint[] = [];
  if (spec.compare === "previous") {
    const len = daysBetween(start, end);
    const prevEnd = addDays(start, -1);
    const prevStart = addDays(prevEnd, -(len - 1));
    previous = points.filter((p) => within(p, prevStart, prevEnd));
  } else if (spec.compare === "year") {
    previous = points.filter((p) => within(p, addYears(start, -1), addYears(end, -1)));
  }
  return { current, previous, start, end };
}

export function dailyFromBreakdown(
  source: MetricSource,
  rows: BreakdownRaw[],
  filter: MetricFilter,
): DailyPoint[] {
  if (!filter) return [];
  const keys = getSourceDef(source)?.breakdownMetrics ?? [];
  const byDate = new Map<string, DailyPoint>();
  for (const row of rows) {
    if (row.dimension_type !== filter.dimensionType || row.dimension_value !== filter.value) continue;
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, label: formatDayLabel(row.date), metrics: emptyTotals(source) };
      byDate.set(row.date, point);
    }
    for (const key of keys) point.metrics[key] += row.metrics[key] ?? 0;
  }
  return [...byDate.values()]
    .map((point) => ({ ...point, metrics: applyDerived(source, point.metrics) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type BreakdownEntry = { value: string; metrics: MetricTotals };

export function rankBreakdown(
  source: MetricSource,
  rows: BreakdownRaw[],
  dimensionType: string,
  limit = 8,
): BreakdownEntry[] {
  const keys = getSourceDef(source)?.breakdownMetrics ?? [];
  const byValue = new Map<string, BreakdownEntry>();
  for (const row of rows) {
    if (row.dimension_type !== dimensionType) continue;
    let entry = byValue.get(row.dimension_value);
    if (!entry) {
      entry = { value: row.dimension_value, metrics: {} };
      for (const key of keys) entry.metrics[key] = 0;
      byValue.set(row.dimension_value, entry);
    }
    for (const key of keys) entry.metrics[key] += row.metrics[key] ?? 0;
  }
  const sortKey = keys[0] ?? "sessions";
  return [...byValue.values()]
    .sort((a, b) => (b.metrics[sortKey] ?? 0) - (a.metrics[sortKey] ?? 0))
    .slice(0, limit);
}

export function hasEcommerce(source: MetricSource, totals: MetricTotals): boolean {
  return (getSourceDef(source)?.metrics ?? [])
    .filter((m) => m.ecommerce)
    .some((m) => (totals[m.key] ?? 0) > 0);
}
