import { AppShell } from "@/components/app-shell";
import { DashboardContent } from "@/components/dashboard-content";
import { Ga4DashboardSection } from "@/components/dashboard/ga4-dashboard-section";
import { getAuthorizedConnectorChannels } from "@/lib/connector-channels";
import { getClientPerformanceSummaries, getDashboardMeta } from "@/lib/dashboard";
import {
  getMappedClientIds,
  purgeOrphanWorkspacePerformance,
  purgeUnmappedClientPerformance,
  sanitizeDisconnectedChannelMetrics,
} from "@/lib/performance-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";
import { getClients, getConnectorCatalog, getDailyPerformance, getInsights } from "@/lib/data";

export default async function DashboardPage() {
  const workspaceId = await getActiveWorkspaceId();
  const authorizedChannelKeys = workspaceId ? await getAuthorizedConnectorChannels(workspaceId) : [];

  let mappedClientIds = new Set<string>();
  if (workspaceId) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      mappedClientIds = await getMappedClientIds(admin, workspaceId, authorizedChannelKeys);
      await purgeOrphanWorkspacePerformance(admin, workspaceId);
      await sanitizeDisconnectedChannelMetrics(admin, workspaceId, authorizedChannelKeys);
      await purgeUnmappedClientPerformance(admin, workspaceId, authorizedChannelKeys);
      if (mappedClientIds.size > 0) {
        for (const clientId of mappedClientIds) {
          const { refreshClientMetricsFromPerformance } = await import("@/lib/clients");
          await refreshClientMetricsFromPerformance(workspaceId, clientId);
        }
      }
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
        {workspaceId && (
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Website analytics</h2>
              <p className="text-sm text-muted-foreground">
                GA4 metrics across all clients · customize, filter, and rearrange
              </p>
            </div>
            <Ga4DashboardSection
              workspaceId={workspaceId}
              scope="overview"
              scopeKey="overview"
              currency={currency}
            />
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
        />
      </main>
    </AppShell>
  );
}
