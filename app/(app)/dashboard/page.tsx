import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/dashboard-content";
import { SourceDashboardSection } from "@/components/dashboard/source-dashboard-section";
import { SourceTabs } from "@/components/dashboard/source-tabs";
import { SampleDataButton } from "@/components/dashboard/sample-data-button";
import { availableSources } from "@/lib/metrics/store";
import { getAuthorizedConnectorChannels } from "@/lib/connector-channels";
import { getClientPerformanceSummaries, getDashboardMeta } from "@/lib/dashboard";
import { getMappedClientIds } from "@/lib/performance-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";
import { getClients, getConnectorCatalog, getDailyPerformance, getInsights } from "@/lib/data";

export default async function DashboardPage() {
  const workspaceId = await getActiveWorkspaceId();
  const overviewSources = workspaceId ? await availableSources(workspaceId, "overview") : [];
  const authorizedChannelKeys = workspaceId ? await getAuthorizedConnectorChannels(workspaceId) : [];

  // Reads below are already scoped by mappedClientIds + authorizedChannelKeys, so
  // we only need the mapping here. DB hygiene (purge orphaned/unmapped rows,
  // sanitize disconnected channels, refresh client summaries) now runs in the
  // sync path and at mutation time instead of on every dashboard render.
  let mappedClientIds = new Set<string>();
  if (workspaceId) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      mappedClientIds = await getMappedClientIds(admin, workspaceId, authorizedChannelKeys);
    }
  }

  const [clients, insights, dailyPerformance, connectors, workspace] = await Promise.all([
    getClients(),
    getInsights(),
    getDailyPerformance(undefined, authorizedChannelKeys, mappedClientIds),
    getConnectorCatalog(),
    getActiveWorkspace(),
  ]);

  const [meta, clientPerformanceMap] = workspaceId
    ? await Promise.all([
        getDashboardMeta(workspaceId, connectors, dailyPerformance, clients.length, authorizedChannelKeys),
        getClientPerformanceSummaries(workspaceId, authorizedChannelKeys, mappedClientIds),
      ])
    : [
        {
          status: "empty" as const,
          hasLiveData: false,
          performanceDayCount: 0,
          syncedClientCount: 0,
          totalClientCount: clients.length,
          unmappedClientCount: 0,
          lastSyncLabel: null,
          connectedConnectors: [],
          liveChannelSpend: [],
        },
        new Map<string, { spend: number; conversions: number; spendDelta: number }>(),
      ];

  const clientPerformance = Object.fromEntries(clientPerformanceMap.entries());
  const activeCount = clients.filter((c) => c.status === "active").length;
  const currency = workspace?.currency ?? "NZD";

  return (
    <AppShell
      title="Agency overview"
      subtitle={`Last 30 days · ${activeCount} active client${activeCount === 1 ? "" : "s"} · ${currency}`}
    >
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        {workspaceId && overviewSources.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">Analytics</h2>
                <p className="text-sm text-muted-foreground">
                  Metrics across all clients · switch sources, customize, filter, and rearrange
                </p>
              </div>
              <SampleDataButton />
            </div>
            <SourceTabs sources={overviewSources}>
              {overviewSources.map((source) => (
                <SourceDashboardSection
                  key={source}
                  workspaceId={workspaceId}
                  source={source}
                  scope="overview"
                  scopeBase="overview"
                  currency={currency}
                />
              ))}
            </SourceTabs>
          </section>
        )}

        {workspaceId && overviewSources.length === 0 && (
          <section className="ambient-glow flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-dashed bg-card p-12 text-center">
            <h2 className="font-display text-lg font-semibold">No analytics data yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Connect a source (GA4, Search Console, Google Ads, Meta, LinkedIn, TikTok) and run a sync — or
              load sample data to explore the dashboard right away.
            </p>
            <SampleDataButton variant="default" />
          </section>
        )}
        <DashboardContent
          clients={clients}
          insights={insights}
          dailyPerformance={dailyPerformance}
          connectedChannelKeys={authorizedChannelKeys}
          connectors={connectors}
          meta={meta}
          clientPerformance={clientPerformance}
          currency={currency}
          showLegacyMetrics={false}
        />
      </main>
    </AppShell>
  );
}
