import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  additiveKeys,
  applyDerived,
  emptyTotals,
  formatDayLabel,
  getSourceDef,
  type BreakdownRaw,
  type DailyPoint,
  type MetricSource,
  type Scope,
} from "@/lib/metrics/catalog";

type AdminClient = SupabaseClient<Database>;

function clientIdsForScope(scope: Scope): string[] | null {
  return scope === "overview" ? null : [scope.clientId];
}

// --- Writes (service role, during connector sync) ----------------------------

export type DailyMetricInput = { date: string; metrics: Record<string, number> };
export type BreakdownInput = {
  date: string;
  dimension_type: string;
  dimension_value: string;
  metrics: Record<string, number>;
};

/** Explodes per-day metric records into long rows and upserts them. */
export async function writeDailyMetrics(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  source: MetricSource,
  days: DailyMetricInput[],
) {
  if (!days.length) return;
  const updatedAt = new Date().toISOString();
  const rows = days.flatMap((day) =>
    Object.entries(day.metrics).map(([metric_key, value]) => ({
      workspace_id: workspaceId,
      client_id: clientId,
      source,
      date: day.date,
      metric_key,
      value: Number.isFinite(value) ? value : 0,
      updated_at: updatedAt,
    })),
  );
  // Upsert in chunks to stay well within payload limits.
  for (let i = 0; i < rows.length; i += 1000) {
    await admin
      .from("metric_daily")
      .upsert(rows.slice(i, i + 1000), { onConflict: "workspace_id,client_id,source,date,metric_key" });
  }
}

/** Replaces the breakdown rows for a client+source (full re-pull each sync). */
export async function writeBreakdowns(
  admin: AdminClient,
  workspaceId: string,
  clientId: string,
  source: MetricSource,
  entries: BreakdownInput[],
) {
  await admin
    .from("metric_breakdown")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("source", source);

  if (!entries.length) return;
  const updatedAt = new Date().toISOString();
  const rows = entries.flatMap((entry) =>
    Object.entries(entry.metrics).map(([metric_key, value]) => ({
      workspace_id: workspaceId,
      client_id: clientId,
      source,
      date: entry.date,
      dimension_type: entry.dimension_type,
      dimension_value: entry.dimension_value.slice(0, 512),
      metric_key,
      value: Number.isFinite(value) ? value : 0,
      updated_at: updatedAt,
    })),
  );
  for (let i = 0; i < rows.length; i += 1000) {
    await admin.from("metric_breakdown").insert(rows.slice(i, i + 1000));
  }
}

// --- Reads (user client, RLS) ------------------------------------------------

/** Pivots long rows into daily points (one record per date) with derived rates. */
export async function readDaily(workspaceId: string, scope: Scope, source: MetricSource): Promise<DailyPoint[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("metric_daily")
    .select("date, metric_key, value")
    .eq("workspace_id", workspaceId)
    .eq("source", source);
  const clientIds = clientIdsForScope(scope);
  if (clientIds) query = query.in("client_id", clientIds);

  const { data } = await query;
  const adds = new Set(additiveKeys(source));
  const byDate = new Map<string, DailyPoint>();
  for (const row of (data ?? []) as Array<{ date: string; metric_key: string; value: number }>) {
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, label: formatDayLabel(row.date), metrics: emptyTotals(source) };
      byDate.set(row.date, point);
    }
    // Sum additive metrics across clients (overview); derived recomputed after.
    if (adds.has(row.metric_key)) point.metrics[row.metric_key] += row.value;
  }

  return [...byDate.values()]
    .map((point) => ({ ...point, metrics: applyDerived(source, point.metrics) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Raw breakdown rows pivoted to one record per (date, dimension value). */
export async function readBreakdownRaw(
  workspaceId: string,
  scope: Scope,
  source: MetricSource,
): Promise<BreakdownRaw[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from("metric_breakdown")
    .select("date, dimension_type, dimension_value, metric_key, value")
    .eq("workspace_id", workspaceId)
    .eq("source", source);
  const clientIds = clientIdsForScope(scope);
  if (clientIds) query = query.in("client_id", clientIds);

  const { data } = await query;
  const byKey = new Map<string, BreakdownRaw>();
  for (const row of (data ?? []) as Array<{
    date: string;
    dimension_type: string;
    dimension_value: string;
    metric_key: string;
    value: number;
  }>) {
    const key = `${row.date}|${row.dimension_type}|${row.dimension_value}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        date: row.date,
        dimension_type: row.dimension_type,
        dimension_value: row.dimension_value,
        metrics: {},
      };
      byKey.set(key, entry);
    }
    entry.metrics[row.metric_key] = (entry.metrics[row.metric_key] ?? 0) + row.value;
  }
  return [...byKey.values()];
}

export async function hasSourceData(workspaceId: string, scope: Scope, source: MetricSource): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  let query = supabase
    .from("metric_daily")
    .select("date", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("source", source);
  const clientIds = clientIdsForScope(scope);
  if (clientIds) query = query.in("client_id", clientIds);

  const { count } = await query;
  return (count ?? 0) > 0;
}

/** Sources that have any stored data for the scope (drives the source switcher). */
export async function availableSources(workspaceId: string, scope: Scope): Promise<MetricSource[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase.from("metric_daily").select("source").eq("workspace_id", workspaceId);
  const clientIds = clientIdsForScope(scope);
  if (clientIds) query = query.in("client_id", clientIds);

  const { data } = await query;
  const present = new Set((data ?? []).map((row) => (row as { source: string }).source));
  return ([...present] as MetricSource[]).filter((source) => getSourceDef(source));
}
