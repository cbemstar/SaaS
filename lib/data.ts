import { channels, type ChannelKey, type Client, type DailyPerformancePoint, type Insight, type ReportTemplate, type Totals } from "@/lib/catalog";
import { connectorCatalog as defaultConnectors } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ConnectorAccountRow, DailyPerformanceRow, ReportRow, ReportTemplateRow } from "@/lib/supabase/types";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { hasSupabaseConfig } from "@/lib/env";

export { channels };
export type { ChannelKey, Client, DailyPerformancePoint, Insight, ReportTemplate, Totals };

export type ConnectorCatalogItem = {
  key: ChannelKey;
  label: string;
  description: string;
  status: "connected" | "action_required" | "disconnected";
  accounts: number;
  lastSync: string;
};

import { calculateTotalsFromPerformance } from "@/lib/dashboard";

function mapConnector(row: ConnectorAccountRow): ConnectorCatalogItem {
  return {
    key: row.channel,
    label: row.label,
    description: row.description,
    status: row.status,
    accounts: row.accounts,
    lastSync: row.last_sync,
  };
}

function mapTemplate(row: ReportTemplateRow): ReportTemplate {
  const layout = row.layout as { items?: unknown[] } | null | undefined;
  const hasLayout = Boolean(layout && Array.isArray(layout.items) && layout.items.length > 0);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pages: row.pages,
    used: row.used,
    sections: row.sections ?? defaultSectionsForTemplate(row.id),
    accent: row.accent ?? null,
    status: row.status ?? "draft",
    hasLayout,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function defaultSectionsForTemplate(id: string): string[] {
  switch (id) {
    case "paid-only":
      return ["kpi", "perf", "mix", "table"];
    case "seo-organic":
      return ["kpi", "conv", "perf", "recommendations"];
    case "exec-summary":
      return ["kpi", "ai"];
    default:
      return ["kpi", "ai", "perf", "mix", "conv"];
  }
}

function mapDailyPerformance(row: DailyPerformanceRow): DailyPerformancePoint {
  return {
    date: row.date,
    label: row.label,
    meta: row.meta,
    google_ads: row.google_ads,
    tiktok: row.tiktok,
    linkedin: row.linkedin,
    ga4: row.ga4,
    search_console: row.search_console,
    conversions: row.conversions,
  };
}

function aggregateDailyRows(rows: DailyPerformanceRow[]): DailyPerformancePoint[] {
  const byDate = new Map<string, DailyPerformancePoint>();

  for (const row of rows) {
    const existing = byDate.get(row.date) ?? {
      date: row.date,
      label: row.label,
      meta: 0,
      google_ads: 0,
      tiktok: 0,
      linkedin: 0,
      ga4: 0,
      search_console: 0,
      conversions: 0,
    };
    existing.meta += row.meta;
    existing.google_ads += row.google_ads;
    existing.tiktok += row.tiktok;
    existing.linkedin += row.linkedin;
    existing.ga4 += row.ga4;
    existing.search_console += row.search_console;
    existing.conversions += row.conversions;
    byDate.set(row.date, existing);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateTotals(dailyPerformance: DailyPerformancePoint[]): Totals {
  return calculateTotalsFromPerformance(dailyPerformance);
}

async function shouldUseSupabaseData() {
  if (!hasSupabaseConfig) {
    return false;
  }
  const workspaceId = await getActiveWorkspaceId();
  return Boolean(workspaceId);
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createSupabaseServerClient();
  const useDb = await shouldUseSupabaseData();
  if (!supabase || !useDb) return [];

  const workspaceId = await getActiveWorkspaceId();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("workspace_id", workspaceId!)
    .order("monthlySpend", { ascending: false });

  if (error) {
    console.error("Failed to load clients", error);
    return [];
  }

  return data ?? [];
}

export async function getClient(id: string): Promise<Client | undefined> {
  const clients = await getClients();
  return clients.find((client) => client.id === id);
}

export async function getInsights(): Promise<Insight[]> {
  const supabase = await createSupabaseServerClient();
  const useDb = await shouldUseSupabaseData();
  if (!supabase || !useDb) return [];

  const workspaceId = await getActiveWorkspaceId();
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("workspace_id", workspaceId!)
    .eq("dismissed", false)
    .order("created_at_db", { ascending: false });

  if (error || !data?.length) return [];
  return data.map((row) => ({
    id: row.id,
    client: row.client,
    clientId: row.clientId,
    channel: row.channel,
    severity: row.severity,
    type: row.type,
    title: row.title,
    body: row.body,
    action: row.action,
    evidence: row.evidence,
    estImpact: row.estImpact,
    createdAt: row.createdAt,
    approved: row.approved ?? false,
  }));
}

export async function getClientInsights(clientId: string): Promise<Insight[]> {
  const insights = await getInsights();
  return insights.filter((insight) => insight.clientId === clientId);
}

export async function getDailyPerformance(
  clientId?: string,
  authorizedChannels?: ChannelKey[],
  mappedClientIds?: Set<string>,
): Promise<DailyPerformancePoint[]> {
  const supabase = await createSupabaseServerClient();
  const useDb = await shouldUseSupabaseData();
  if (!supabase || !useDb) return [];

  const workspaceId = await getActiveWorkspaceId();
  let query = supabase.from("daily_performance").select("*").eq("workspace_id", workspaceId!).order("date", { ascending: true });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error || !data?.length) return [];

  const { filterSeriesToChannels } = await import("@/lib/performance-data");

  const scopedRows =
    mappedClientIds && mappedClientIds.size > 0
      ? data.filter((row) => row.client_id && mappedClientIds.has(row.client_id))
      : data;

  if (!scopedRows.length) return [];

  if (clientId) {
    const points = scopedRows.map(mapDailyPerformance);
    return authorizedChannels ? filterSeriesToChannels(points, authorizedChannels) : points;
  }

  const aggregated = aggregateDailyRows(scopedRows);
  return authorizedChannels ? filterSeriesToChannels(aggregated, authorizedChannels) : aggregated;
}

export async function getTotals(): Promise<Totals> {
  return calculateTotals(await getDailyPerformance());
}

export async function getConnectorCatalog(): Promise<ConnectorCatalogItem[]> {
  const supabase = await createSupabaseServerClient();
  const useDb = await shouldUseSupabaseData();
  if (!supabase || !useDb) return [];

  const workspaceId = await getActiveWorkspaceId();
  const { data, error } = await supabase
    .from("connector_accounts")
    .select("*")
    .eq("workspace_id", workspaceId!)
    .order("label", { ascending: true });

  if (error) {
    console.error("Failed to load connector catalog", error);
  }

  if (data?.length) {
    return data.map(mapConnector);
  }

  return defaultConnectors.map((connector) => ({
    key: connector.key,
    label: connector.label,
    description: connector.description,
    status: "disconnected" as const,
    accounts: 0,
    lastSync: "Never",
  }));
}

export async function getReportTemplates(): Promise<ReportTemplate[]> {
  const supabase = await createSupabaseServerClient();
  const useDb = await shouldUseSupabaseData();
  if (!supabase || !useDb) {
    return [];
  }

  const workspaceId = await getActiveWorkspaceId();
  const { data, error } = await supabase
    .from("report_templates")
    .select("*")
    .eq("workspace_id", workspaceId!)
    .order("updated_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }
  return data.map(mapTemplate);
}

export async function getReports() {
  const supabase = await createSupabaseServerClient();
  const useDb = await shouldUseSupabaseData();
  if (!supabase || !useDb) return [];

  const workspaceId = await getActiveWorkspaceId();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("workspace_id", workspaceId!)
    .order("updated_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ReportRow[];
}
