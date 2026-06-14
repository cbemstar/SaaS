import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ga4MetricKeys,
  type Ga4DimensionType,
  type Ga4MetricKey,
  type Ga4BreakdownRow,
  type Ga4DailyMetricsRow,
} from "@/lib/supabase/types";

export type Ga4Scope = "overview" | { clientId: string };

export type Ga4Filter = { dimensionType: Ga4DimensionType; value: string } | null;

export type Ga4DailyPoint = { date: string; label: string } & Record<Ga4MetricKey, number>;

export type Ga4MetricTotals = Record<Ga4MetricKey, number>;

export type Ga4Summary = {
  hasData: boolean;
  daily: Ga4DailyPoint[];
  totals: Ga4MetricTotals;
  previousTotals: Ga4MetricTotals;
};

export type Ga4BreakdownEntry = {
  value: string;
  sessions: number;
  total_users: number;
  engaged_sessions: number;
  key_events: number;
  screen_page_views: number;
};

// Metrics that sum across days. The rest are ratios derived from the sums so
// aggregating a date range stays correct (you cannot average a rate of a rate).
const ADDITIVE_KEYS: Ga4MetricKey[] = [
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

function emptyTotals(): Ga4MetricTotals {
  return Object.fromEntries(ga4MetricKeys.map((key) => [key, 0])) as Ga4MetricTotals;
}

function withDerivedRates(totals: Ga4MetricTotals): Ga4MetricTotals {
  const sessions = totals.sessions || 0;
  const users = totals.total_users || 0;
  totals.engagement_rate = sessions > 0 ? totals.engaged_sessions / sessions : 0;
  totals.bounce_rate = sessions > 0 ? 1 - totals.engaged_sessions / sessions : 0;
  totals.sessions_per_user = users > 0 ? sessions / users : 0;
  totals.views_per_session = sessions > 0 ? totals.screen_page_views / sessions : 0;
  totals.average_session_duration = sessions > 0 ? totals.user_engagement_duration / sessions : 0;
  return totals;
}

function aggregate(points: Array<Partial<Record<Ga4MetricKey, number>>>): Ga4MetricTotals {
  const totals = emptyTotals();
  for (const point of points) {
    for (const key of ADDITIVE_KEYS) {
      totals[key] += point[key] ?? 0;
    }
  }
  return withDerivedRates(totals);
}

function formatLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function dateMinusDays(anchor: string, days: number) {
  const d = new Date(`${anchor}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function resolveClientIds(workspaceId: string, scope: Ga4Scope): Promise<string[] | null> {
  if (scope !== "overview") {
    return [scope.clientId];
  }
  return null; // overview = all clients in workspace (no client_id filter)
}

/**
 * Daily GA4 points for the scope. With no filter, reads the full curated metric
 * set from ga4_daily_metrics. With a dimension filter, reads the breakdown
 * subset (sessions/users/engaged/key events/page views) from ga4_breakdowns.
 * Overview scope sums across all of the workspace's clients per day.
 */
export async function getGa4Daily(
  workspaceId: string,
  scope: Ga4Scope,
  filter: Ga4Filter = null,
): Promise<Ga4DailyPoint[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const clientIds = await resolveClientIds(workspaceId, scope);
  const byDate = new Map<string, Ga4DailyPoint>();

  const ensure = (date: string): Ga4DailyPoint => {
    let point = byDate.get(date);
    if (!point) {
      point = { date, label: formatLabel(date), ...emptyTotals() };
      byDate.set(date, point);
    }
    return point;
  };

  if (filter) {
    let query = supabase
      .from("ga4_breakdowns")
      .select("date, sessions, total_users, engaged_sessions, key_events, screen_page_views")
      .eq("workspace_id", workspaceId)
      .eq("dimension_type", filter.dimensionType)
      .eq("dimension_value", filter.value);
    if (clientIds) query = query.in("client_id", clientIds);

    const { data } = await query;
    for (const row of (data ?? []) as Ga4BreakdownRow[]) {
      const point = ensure(row.date);
      point.sessions += row.sessions;
      point.total_users += row.total_users;
      point.engaged_sessions += row.engaged_sessions;
      point.key_events += row.key_events;
      point.screen_page_views += row.screen_page_views;
    }
  } else {
    let query = supabase.from("ga4_daily_metrics").select("*").eq("workspace_id", workspaceId);
    if (clientIds) query = query.in("client_id", clientIds);

    const { data } = await query;
    for (const row of (data ?? []) as Ga4DailyMetricsRow[]) {
      const point = ensure(row.date);
      for (const key of ADDITIVE_KEYS) {
        point[key] += row[key] ?? 0;
      }
    }
  }

  return [...byDate.values()]
    .map((point) => ({ ...point, ...withDerivedRates(point as Ga4MetricTotals) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Daily series + current-vs-previous-period totals for delta display. */
export async function getGa4Summary(
  workspaceId: string,
  scope: Ga4Scope,
  days: number,
  filter: Ga4Filter = null,
): Promise<Ga4Summary> {
  // Pull the whole stored window once, then split into current / previous periods.
  const allDaily = await getGa4Daily(workspaceId, scope, filter);
  if (!allDaily.length) {
    return { hasData: false, daily: [], totals: emptyTotals(), previousTotals: emptyTotals() };
  }

  const anchor = allDaily[allDaily.length - 1].date;
  const currentCutoff = dateMinusDays(anchor, days);
  const previousCutoff = dateMinusDays(anchor, days * 2);

  const current = allDaily.filter((point) => point.date > currentCutoff);
  const previous = allDaily.filter((point) => point.date > previousCutoff && point.date <= currentCutoff);

  return {
    hasData: current.length > 0,
    daily: current,
    totals: aggregate(current),
    previousTotals: aggregate(previous),
  };
}

/** Top breakdown rows for a dimension over the window (for tables + filter options). */
export async function getGa4Breakdown(
  workspaceId: string,
  scope: Ga4Scope,
  dimensionType: Ga4DimensionType,
  limit = 8,
): Promise<Ga4BreakdownEntry[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const clientIds = await resolveClientIds(workspaceId, scope);
  let query = supabase
    .from("ga4_breakdowns")
    .select("dimension_value, sessions, total_users, engaged_sessions, key_events, screen_page_views")
    .eq("workspace_id", workspaceId)
    .eq("dimension_type", dimensionType);
  if (clientIds) query = query.in("client_id", clientIds);

  const { data } = await query;
  const byValue = new Map<string, Ga4BreakdownEntry>();
  for (const row of (data ?? []) as Ga4BreakdownRow[]) {
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

/** Whether the scope has any stored GA4 data at all (drives empty state). */
export async function hasGa4Data(workspaceId: string, scope: Ga4Scope): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const clientIds = await resolveClientIds(workspaceId, scope);
  let query = supabase
    .from("ga4_daily_metrics")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (clientIds) query = query.in("client_id", clientIds);

  const { count } = await query;
  return (count ?? 0) > 0;
}
