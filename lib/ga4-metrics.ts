import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Ga4BreakdownRow, Ga4DailyMetricsRow } from "@/lib/supabase/types";
import {
  ADDITIVE_KEYS,
  emptyTotals,
  formatDayLabel,
  withDerivedRates,
  type Ga4BreakdownRaw,
  type Ga4DailyPoint,
} from "@/lib/ga4-aggregate";

export type Ga4Scope = "overview" | { clientId: string };

function clientIdsForScope(scope: Ga4Scope): string[] | null {
  return scope === "overview" ? null : [scope.clientId];
}

/**
 * All stored daily GA4 points for the scope, with the full curated metric set.
 * Overview sums across the workspace's clients per day. The UI windows/filters
 * this client-side, so no date or filter params are needed here.
 */
export async function getGa4Daily(workspaceId: string, scope: Ga4Scope): Promise<Ga4DailyPoint[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase.from("ga4_daily_metrics").select("*").eq("workspace_id", workspaceId);
  const clientIds = clientIdsForScope(scope);
  if (clientIds) query = query.in("client_id", clientIds);

  const { data } = await query;
  const byDate = new Map<string, Ga4DailyPoint>();
  for (const row of (data ?? []) as Ga4DailyMetricsRow[]) {
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, label: formatDayLabel(row.date), ...emptyTotals() };
      byDate.set(row.date, point);
    }
    for (const key of ADDITIVE_KEYS) {
      point[key] += row[key] ?? 0;
    }
  }

  return [...byDate.values()]
    .map((point) => withDerivedRates(point))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Raw per-date breakdown rows for the scope (powers tables + dimension filters). */
export async function getGa4BreakdownRaw(workspaceId: string, scope: Ga4Scope): Promise<Ga4BreakdownRaw[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("ga4_breakdowns")
    .select("date, dimension_type, dimension_value, sessions, total_users, engaged_sessions, key_events, screen_page_views")
    .eq("workspace_id", workspaceId);
  const clientIds = clientIdsForScope(scope);
  if (clientIds) query = query.in("client_id", clientIds);

  const { data } = await query;
  return ((data ?? []) as Ga4BreakdownRow[]).map((row) => ({
    date: row.date,
    dimension_type: row.dimension_type,
    dimension_value: row.dimension_value,
    sessions: row.sessions,
    total_users: row.total_users,
    engaged_sessions: row.engaged_sessions,
    key_events: row.key_events,
    screen_page_views: row.screen_page_views,
  }));
}

/** Whether the scope has any stored GA4 data (drives the empty state). */
export async function hasGa4Data(workspaceId: string, scope: Ga4Scope): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  let query = supabase
    .from("ga4_daily_metrics")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const clientIds = clientIdsForScope(scope);
  if (clientIds) query = query.in("client_id", clientIds);

  const { count } = await query;
  return (count ?? 0) > 0;
}
