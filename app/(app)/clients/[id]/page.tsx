import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Download, ExternalLink, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClientSettingsForm } from "@/components/client-settings-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChannelPill } from "@/components/channel-pill";
import { InsightCard } from "@/components/insight-card";
import { KpiCard } from "@/components/kpi-card";
import { listClientConnectorLinks } from "@/lib/client-connector-links";
import { getClient, getClientInsights, getConnectorCatalog, getDailyPerformance } from "@/lib/data";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";
import { SourceDashboardSection } from "@/components/dashboard/source-dashboard-section";
import { SourceTabs } from "@/components/dashboard/source-tabs";
import { SampleDataButton } from "@/components/dashboard/sample-data-button";
import { availableSources } from "@/lib/metrics/store";
import { buildSparkSeries, calculateTotalsFromPerformance } from "@/lib/dashboard";
import { getAuthorizedConnectorChannels } from "@/lib/connector-channels";
import { spendForChannels } from "@/lib/performance-data";
import { cn, formatCurrency } from "@/lib/utils";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await getActiveWorkspaceId();
  const workspace = workspaceId ? await getActiveWorkspace() : null;
  const currency = workspace?.currency ?? "NZD";
  const dashboardSources = workspaceId ? await availableSources(workspaceId, { clientId: id }) : [];
  const authorizedChannelKeys = workspaceId ? await getAuthorizedConnectorChannels(workspaceId) : [];
  const [client, clientInsights, dailyPerformance, connectors, connectorLinks] = await Promise.all([
    getClient(id),
    getClientInsights(id),
    getDailyPerformance(id, authorizedChannelKeys),
    getConnectorCatalog(),
    workspaceId ? listClientConnectorLinks(workspaceId, id) : Promise.resolve([]),
  ]);
  if (!client) return notFound();

  const connectedChannelKeys = authorizedChannelKeys;
  const filteredPerformance = dailyPerformance;
  const hasLiveData =
    connectedChannelKeys.length > 0 &&
    filteredPerformance.reduce((sum, day) => sum + spendForChannels(day, connectedChannelKeys), 0) > 0;
  const totals = calculateTotalsFromPerformance(filteredPerformance, connectedChannelKeys);
  const spendSpark = buildSparkSeries(filteredPerformance, (day) => spendForChannels(day, connectedChannelKeys));
  const conversionSpark = buildSparkSeries(filteredPerformance, (day) => day.conversions);

  return (
    <AppShell title={client.name} subtitle={`${client.industry} · ${client.channels.length} channels tracked`}>
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/clients" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> All clients
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Last 30 days
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/api/reports/pdf?clientId=${client.id}`} target="_blank">
                <Download className="h-3.5 w-3.5" /> Export PDF
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/reports?client=${client.id}&tab=builder`}>
                <Send className="h-3.5 w-3.5" /> Send report
              </Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className={cn("h-20 bg-gradient-to-r", client.accent)} />
          <CardContent className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-card">
                <AvatarFallback className={cn("text-xl font-semibold text-foreground", `bg-gradient-to-br ${client.accent}`)}>
                  {client.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">{client.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {client.industry}
                  <span className="text-border">·</span>
                  <Badge variant="success" className="capitalize">{client.status}</Badge>
                  <span className="text-border">·</span>
                  {client.channels.map((ch) => <ChannelPill key={ch} channel={ch} />)}
                </div>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard">
                <ExternalLink className="h-3.5 w-3.5" /> Agency overview
              </Link>
            </Button>
          </CardContent>
        </Card>

        {hasLiveData ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Spend"
              value={formatCurrency(totals.spend)}
              delta={totals.spendDelta}
              hint="Synced · last 30 days"
              spark={spendSpark.length > 1 ? spendSpark : undefined}
            />
            <KpiCard
              label="Conversions"
              value={totals.conversions.toLocaleString()}
              delta={totals.conversionsDelta}
              hint="Synced · last 30 days"
              spark={conversionSpark.length > 1 ? conversionSpark : undefined}
            />
            <KpiCard
              label="Avg. CPA"
              value={totals.conversions > 0 ? formatCurrency(totals.cpa) : "—"}
              delta={totals.cpaDelta}
              hint="Cost per conversion"
              invertDelta
              spark={
                buildSparkSeries(filteredPerformance, (day) => {
                  const spend = spendForChannels(day, connectedChannelKeys);
                  return day.conversions > 0 ? spend / day.conversions : 0;
                }).length > 1
                  ? buildSparkSeries(filteredPerformance, (day) => {
                      const spend = spendForChannels(day, connectedChannelKeys);
                      return day.conversions > 0 ? spend / day.conversions : 0;
                    })
                  : undefined
              }
            />
            <KpiCard label="Open insights" value={clientInsights.length.toString()} delta={0} hideDelta hint="from AI engine" />
          </div>
        ) : (
          <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
            No synced metrics for this client yet. Map ad accounts in Settings, then run Sync on Connectors.
          </Card>
        )}

        <Tabs defaultValue="website">
          <TabsList>
            <TabsTrigger value="website">Analytics</TabsTrigger>
            <TabsTrigger value="insights">Insights · {clientInsights.length}</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="website" className="space-y-4">
            {!workspaceId ? (
              <p className="text-sm text-muted-foreground">Sign in to view analytics.</p>
            ) : dashboardSources.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-12 text-center">
                <h2 className="font-display text-lg font-semibold">No analytics data yet</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Connect this client to GA4, Search Console, Google Ads, or another source on the Connectors
                  page, then run a sync — or load sample data to explore the dashboard.
                </p>
                <SampleDataButton variant="default" />
              </div>
            ) : (
              <SourceTabs sources={dashboardSources}>
                {dashboardSources.map((source) => (
                  <SourceDashboardSection
                    key={source}
                    workspaceId={workspaceId}
                    source={source}
                    scope={{ clientId: id }}
                    scopeBase={id}
                    currency={currency}
                  />
                ))}
              </SourceTabs>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-3">
            {clientInsights.length > 0 ? (
              clientInsights.map((i) => <InsightCard key={i.id} insight={i} />)
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No open insights for this client. Generate one from the Insights page.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <ClientSettingsForm client={client} connectors={connectors} connectorLinks={connectorLinks} />
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}
