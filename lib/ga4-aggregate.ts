import { ga4MetricKeys, type Ga4DimensionType, type Ga4MetricKey } from "@/lib/supabase/types";

export type { Ga4DimensionType, Ga4MetricKey };
export { ga4MetricKeys };

export type Ga4MetricTotals = Record<Ga4MetricKey, number>;
export type Ga4DailyPoint = { date: string; label: string } & Ga4MetricTotals;

export type Ga4BreakdownRaw = {
  date: string;
  dimension_type: Ga4DimensionType;
  dimension_value: string;
  sessions: number;
  total_users: number;
  engaged_sessions: number;
  key_events: number;
  screen_page_views: number;
};

export type Ga4Filter = { dimensionType: Ga4DimensionType; value: string } | null;

export type CardSize = "sm" | "md" | "lg";
export type DashboardLayout = {
  cards: Array<{ metric: Ga4MetricKey; size: CardSize }>;
  trendMetric: Ga4MetricKey;
  days: number;
  filter: Ga4Filter;
};

// Metrics that sum across days; ratios are derived from the sums afterwards.
export const ADDITIVE_KEYS: Ga4MetricKey[] = [
  "total_users",
  "new_users",
  "active_users",
  "sessions",
  "engaged_sessions",
  "user_engagement_duration",
  "screen_page_views",
  "event_count",
  "key_events",
  "total_revenue",
  "transactions",
  "purchase_revenue",
];

// Metrics available when a dimension filter is active (stored in ga4_breakdowns).
export const FILTERABLE_KEYS: Ga4MetricKey[] = [
  "sessions",
  "total_users",
  "engaged_sessions",
  "key_events",
  "screen_page_views",
];

type MetricFormat = "number" | "percent" | "decimal" | "duration" | "currency";

export type MetricMeta = {
  label: string;
  short: string;
  format: MetricFormat;
  higherIsBetter: boolean;
  ecommerce?: boolean;
};

export const METRIC_CONFIG: Record<Ga4MetricKey, MetricMeta> = {
  total_users: { label: "Total users", short: "Users", format: "number", higherIsBetter: true },
  new_users: { label: "New users", short: "New users", format: "number", higherIsBetter: true },
  active_users: { label: "Active users", short: "Active", format: "number", higherIsBetter: true },
  sessions: { label: "Sessions", short: "Sessions", format: "number", higherIsBetter: true },
  engaged_sessions: { label: "Engaged sessions", short: "Engaged", format: "number", higherIsBetter: true },
  engagement_rate: { label: "Engagement rate", short: "Engagement", format: "percent", higherIsBetter: true },
  average_session_duration: { label: "Avg. engagement / session", short: "Avg. time", format: "duration", higherIsBetter: true },
  user_engagement_duration: { label: "Total engagement time", short: "Engmt. time", format: "duration", higherIsBetter: true },
  sessions_per_user: { label: "Sessions per user", short: "Sess./user", format: "decimal", higherIsBetter: true },
  screen_page_views: { label: "Page views", short: "Views", format: "number", higherIsBetter: true },
  views_per_session: { label: "Views per session", short: "Views/sess.", format: "decimal", higherIsBetter: true },
  event_count: { label: "Events", short: "Events", format: "number", higherIsBetter: true },
  key_events: { label: "Key events", short: "Key events", format: "number", higherIsBetter: true },
  bounce_rate: { label: "Bounce rate", short: "Bounce", format: "percent", higherIsBetter: false },
  total_revenue: { label: "Total revenue", short: "Revenue", format: "currency", higherIsBetter: true, ecommerce: true },
  transactions: { label: "Transactions", short: "Txns", format: "number", higherIsBetter: true, ecommerce: true },
  purchase_revenue: { label: "Purchase revenue", short: "Purch. rev.", format: "currency", higherIsBetter: true, ecommerce: true },
};

export const DIMENSION_META: Record<Ga4DimensionType, { label: string; filterable: boolean }> = {
  channel_group: { label: "Channel", filterable: true },
  device: { label: "Device", filterable: true },
  country: { label: "Country", filterable: true },
  landing_page: { label: "Landing page", filterable: false },
};

export const DEFAULT_CARDS: Array<{ metric: Ga4MetricKey; size: CardSize }> = [
  { metric: "total_users", size: "sm" },
  { metric: "sessions", size: "sm" },
  { metric: "engagement_rate", size: "sm" },
  { metric: "key_events", size: "sm" },
  { metric: "new_users", size: "sm" },
  { metric: "screen_page_views", size: "sm" },
  { metric: "average_session_duration", size: "sm" },
  { metric: "bounce_rate", size: "sm" },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  cards: DEFAULT_CARDS,
  trendMetric: "sessions",
  days: 30,
  filter: null,
};

export function emptyTotals(): Ga4MetricTotals {
  return Object.fromEntries(ga4MetricKeys.map((key) => [key, 0])) as Ga4MetricTotals;
}

export function withDerivedRates<T extends Ga4MetricTotals>(totals: T): T {
  const sessions = totals.sessions || 0;
  const users = totals.total_users || 0;
  totals.engagement_rate = sessions > 0 ? totals.engaged_sessions / sessions : 0;
  totals.bounce_rate = sessions > 0 ? 1 - totals.engaged_sessions / sessions : 0;
  totals.sessions_per_user = users > 0 ? sessions / users : 0;
  totals.views_per_session = sessions > 0 ? totals.screen_page_views / sessions : 0;
  totals.average_session_duration = sessions > 0 ? totals.user_engagement_duration / sessions : 0;
  return totals;
}

export function aggregateTotals(points: Array<Partial<Ga4MetricTotals>>): Ga4MetricTotals {
  const totals = emptyTotals();
  for (const point of points) {
    for (const key of ADDITIVE_KEYS) {
      totals[key] += point[key] ?? 0;
    }
  }
  return withDerivedRates(totals);
}

export function formatDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function dateMinusDays(anchor: string, days: number) {
  const d = new Date(`${anchor}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Splits sorted daily points into the current window and the preceding one. */
export function sliceWindows(points: Ga4DailyPoint[], days: number) {
  if (!points.length) return { current: [] as Ga4DailyPoint[], previous: [] as Ga4DailyPoint[] };
  const anchor = points[points.length - 1].date;
  const currentCutoff = dateMinusDays(anchor, days);
  const previousCutoff = dateMinusDays(anchor, days * 2);
  return {
    current: points.filter((p) => p.date > currentCutoff),
    previous: points.filter((p) => p.date > previousCutoff && p.date <= currentCutoff),
  };
}

/** Builds daily points from raw breakdown rows for an active dimension filter. */
export function dailyFromBreakdown(rows: Ga4BreakdownRaw[], filter: Ga4Filter): Ga4DailyPoint[] {
  if (!filter) return [];
  const byDate = new Map<string, Ga4DailyPoint>();
  for (const row of rows) {
    if (row.dimension_type !== filter.dimensionType || row.dimension_value !== filter.value) continue;
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, label: formatDayLabel(row.date), ...emptyTotals() };
      byDate.set(row.date, point);
    }
    point.sessions += row.sessions;
    point.total_users += row.total_users;
    point.engaged_sessions += row.engaged_sessions;
    point.key_events += row.key_events;
    point.screen_page_views += row.screen_page_views;
  }
  return [...byDate.values()]
    .map((point) => withDerivedRates(point))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type BreakdownEntry = {
  value: string;
  sessions: number;
  total_users: number;
  engaged_sessions: number;
  key_events: number;
  screen_page_views: number;
};

/** Aggregates raw breakdown rows for a dimension into ranked entries. */
export function rankBreakdown(
  rows: Ga4BreakdownRaw[],
  dimensionType: Ga4DimensionType,
  limit = 8,
): BreakdownEntry[] {
  const byValue = new Map<string, BreakdownEntry>();
  for (const row of rows) {
    if (row.dimension_type !== dimensionType) continue;
    const entry = byValue.get(row.dimension_value) ?? {
      value: row.dimension_value,
      sessions: 0,
      total_users: 0,
      engaged_sessions: 0,
      key_events: 0,
      screen_page_views: 0,
    };
    entry.sessions += row.sessions;
    entry.total_users += row.total_users;
    entry.engaged_sessions += row.engaged_sessions;
    entry.key_events += row.key_events;
    entry.screen_page_views += row.screen_page_views;
    byValue.set(row.dimension_value, entry);
  }
  return [...byValue.values()].sort((a, b) => b.sessions - a.sessions).slice(0, limit);
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatMetric(key: Ga4MetricKey, value: number, currency = "NZD"): string {
  const meta = METRIC_CONFIG[key];
  switch (meta.format) {
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

/** Percentage change current vs previous; null when previous is zero. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** Whether any ecommerce metric has data (drives whether to offer those cards). */
export function hasEcommerce(totals: Ga4MetricTotals): boolean {
  return totals.total_revenue > 0 || totals.transactions > 0 || totals.purchase_revenue > 0;
}
