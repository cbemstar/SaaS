"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardDataBanner } from "@/components/dashboard-data-banner";
import { InsightCard } from "@/components/insight-card";
import { PerformanceChart } from "@/components/performance-chart";
import { ConversionsChart } from "@/components/conversions-chart";
import { ChannelMix } from "@/components/channel-mix";
import { KpiCard } from "@/components/kpi-card";
import { AddClientDialog } from "@/components/add-client-dialog";
import type { ChannelKey, Client, DailyPerformancePoint, Insight } from "@/lib/catalog";
import { channels } from "@/lib/catalog";
import type { ConnectorCatalogItem } from "@/lib/data";
import { OrganicMetricsChart } from "@/components/organic-metrics-chart";
import {
  buildSparkSeries,
  calculateTotalsFromPerformance,
  channelSpendBreakdown,
  organicChannelBreakdown,
  type DashboardMeta,
} from "@/lib/dashboard";
import { filterSeriesToChannels, spendForChannels } from "@/lib/performance-data";
import { cn, formatCurrency } from "@/lib/utils";

type ClientPerformanceSummary = {
  spend: number;
  conversions: number;
  spendDelta: number;
};

type DashboardContentProps = {
  clients: Client[];
  insights: Insight[];
  dailyPerformance: DailyPerformancePoint[];
  connectedChannelKeys: ChannelKey[];
  connectors: ConnectorCatalogItem[];
  meta: DashboardMeta;
  clientPerformance: Record<string, ClientPerformanceSummary>;
  currency: string;
  /** When false, hides the legacy metric KPIs/charts (now shown by the multi-source dashboard). */
  showLegacyMetrics?: boolean;
};

export function DashboardContent({
  clients,
  insights,
  dailyPerformance,
  connectedChannelKeys,
  connectors,
  meta,
  clientPerformance,
  currency,
  showLegacyMetrics = true,
}: DashboardContentProps) {
  const [selectedChannels, setSelectedChannels] = useState<ChannelKey[]>(connectedChannelKeys);

  useEffect(() => {
    setSelectedChannels(connectedChannelKeys);
  }, [connectedChannelKeys]);

  const activeChannels = useMemo(() => {
    const selected = selectedChannels.filter((channel) => connectedChannelKeys.includes(channel));
    return selected.length > 0 ? selected : connectedChannelKeys;
  }, [connectedChannelKeys, selectedChannels]);

  const filteredPerformance = useMemo(
    () => filterSeriesToChannels(dailyPerformance, activeChannels),
    [dailyPerformance, activeChannels],
  );

  const totals = useMemo(
    () => calculateTotalsFromPerformance(filteredPerformance, activeChannels),
    [filteredPerformance, activeChannels],
  );

  const sourceBreakdown = useMemo(
    () => channelSpendBreakdown(filteredPerformance, activeChannels),
    [filteredPerformance, activeChannels],
  );

  const organicBreakdown = useMemo(
    () => organicChannelBreakdown(filteredPerformance, activeChannels),
    [filteredPerformance, activeChannels],
  );

  const totalSessions = useMemo(
    () => filteredPerformance.reduce((sum, day) => sum + (activeChannels.includes("ga4") ? day.ga4 : 0), 0),
    [filteredPerformance, activeChannels],
  );

  const totalSearchClicks = useMemo(
    () =>
      filteredPerformance.reduce(
        (sum, day) => sum + (activeChannels.includes("search_console") ? day.search_console : 0),
        0,
      ),
    [filteredPerformance, activeChannels],
  );

  const hasPaidData = totals.spend > 0;
  const hasOrganicData = totalSessions > 0 || totalSearchClicks > 0;
  const sessionsSpark = buildSparkSeries(filteredPerformance, (day) => (activeChannels.includes("ga4") ? day.ga4 : 0));
  const clicksSpark = buildSparkSeries(filteredPerformance, (day) =>
    activeChannels.includes("search_console") ? day.search_console : 0,
  );

  const spendSpark = buildSparkSeries(filteredPerformance, (day) => spendForChannels(day, activeChannels));
  const conversionSpark = buildSparkSeries(filteredPerformance, (day) => day.conversions);
  const cpaSpark = buildSparkSeries(filteredPerformance, (day) => {
    const spend = spendForChannels(day, activeChannels);
    return day.conversions > 0 ? spend / day.conversions : 0;
  });

  function toggleChannel(channel: ChannelKey) {
    setSelectedChannels((current) => {
      if (current.includes(channel)) {
        const next = current.filter((value) => value !== channel);
        return next.length > 0 ? next : connectedChannelKeys;
      }
      return [...current, channel];
    });
  }

  const sourceLabel =
    activeChannels.length === connectedChannelKeys.length
      ? `All connected (${activeChannels.map((c) => channels[c].short).join(", ")})`
      : activeChannels.map((c) => channels[c].short).join(", ");

  if (clients.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <Badge variant="soft">Empty workspace</Badge>
        <div>
          <h2 className="font-display text-xl font-semibold">Your dashboard is ready</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Add your first client, connect a data source, and sync to see live spend and conversions here.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <AddClientDialog />
          <Button asChild variant="outline">
            <Link href="/connectors">Set up connectors</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <DashboardDataBanner meta={meta} currency={currency} />

      {showLegacyMetrics && (meta.hasLiveData ? (
        <>
          {connectedChannelKeys.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Sources</span>
              {connectedChannelKeys.map((channel) => {
                const active = activeChannels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: channels[channel].color }} />
                    {channels[channel].short}
                  </button>
                );
              })}
              {meta.lastSyncLabel && (
                <span className="text-2xs text-muted-foreground">· Last synced {meta.lastSyncLabel}</span>
              )}
            </div>
          )}

          <div className="grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hasPaidData && (
              <KpiCard
                label="Total spend"
                value={formatCurrency(totals.spend, currency)}
                delta={totals.spendDelta}
                hint={`${sourceLabel} · last 30 days`}
                spark={spendSpark.length > 1 ? spendSpark : undefined}
              />
            )}
            {activeChannels.includes("ga4") && (
              <KpiCard
                label="GA4 sessions"
                value={totalSessions.toLocaleString()}
                delta={0}
                hideDelta
                hint="Last 30 days · synced"
                spark={sessionsSpark.length > 1 ? sessionsSpark : undefined}
              />
            )}
            {activeChannels.includes("search_console") && (
              <KpiCard
                label="Search clicks"
                value={totalSearchClicks.toLocaleString()}
                delta={0}
                hideDelta
                hint="Search Console · last 30 days"
                spark={clicksSpark.length > 1 ? clicksSpark : undefined}
              />
            )}
            {hasPaidData && (
              <KpiCard
                label="Conversions"
                value={totals.conversions.toLocaleString()}
                delta={totals.conversionsDelta}
                hint="Paid channels"
                spark={conversionSpark.length > 1 ? conversionSpark : undefined}
              />
            )}
            {hasPaidData && (
              <KpiCard
                label="Avg. CPA"
                value={totals.conversions > 0 ? formatCurrency(totals.cpa, currency) : "—"}
                delta={totals.cpaDelta}
                hint="Cost per conversion"
                invertDelta
                spark={cpaSpark.length > 1 ? cpaSpark : undefined}
              />
            )}
            <KpiCard
              label="Synced clients"
              value={`${meta.syncedClientCount}/${meta.totalClientCount}`}
              delta={0}
              hideDelta
              hint="Clients with imported metrics"
            />
          </div>

          {hasPaidData && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Spend by channel</CardTitle>
                  <CardDescription>
                    Showing {sourceLabel}
                    {meta.lastSyncLabel ? ` · synced ${meta.lastSyncLabel}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PerformanceChart data={filteredPerformance} activeChannels={activeChannels} />
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Conversions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConversionsChart data={filteredPerformance} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Channel mix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChannelMix data={filteredPerformance} activeChannels={activeChannels} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {hasOrganicData && (
            <Card>
              <CardHeader>
                <CardTitle>Organic performance</CardTitle>
                <CardDescription>GA4 sessions and Search Console clicks · last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <OrganicMetricsChart data={filteredPerformance} activeChannels={activeChannels} />
              </CardContent>
            </Card>
          )}

          {(sourceBreakdown.length > 0 || organicBreakdown.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Source breakdown</CardTitle>
                <CardDescription>Synced metrics per connected source · last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Source</th>
                        <th className="pb-2 pr-4 font-medium">Metric</th>
                        <th className="pb-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceBreakdown.map((row) => (
                        <tr key={row.channel} className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40">
                          <td className="py-2.5 pr-4">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: channels[row.channel].color }}
                              />
                              {row.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">Spend</td>
                          <td className="py-2.5 font-mono tabular-nums">{formatCurrency(row.spend, currency)}</td>
                        </tr>
                      ))}
                      {organicBreakdown.map((row) => (
                        <tr key={row.channel} className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40">
                          <td className="py-2.5 pr-4">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: channels[row.channel].color }}
                              />
                              {row.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 capitalize text-muted-foreground">{row.unit}</td>
                          <td className="py-2.5 font-mono tabular-nums">{row.value.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-dashed p-8 text-center">
          <p className="text-sm font-medium">No synced metrics yet</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            KPIs and charts appear here after you connect a source, map each client&apos;s ad accounts, and run Sync.
            Kōrero only syncs when you ask — no background polling that burns API quotas.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/connectors">Go to connectors</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/clients">Map client accounts</Link>
            </Button>
          </div>
        </Card>
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top insights</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/insights">
                All insights <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.slice(0, 3).map((insight) => (
              <InsightCard key={insight.id} insight={insight} compact />
            ))}
            {insights.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No insights yet. Generate one from the Insights page once live data is syncing.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Clients</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/clients">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {clients.slice(0, 5).map((client) => {
              const live = clientPerformance[client.id];
              const spend = live?.spend ?? 0;
              const spendDelta = live?.spendDelta ?? 0;
              const hasLiveClientData = Boolean(live && live.spend > 0);

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={cn("text-xs font-semibold", `bg-gradient-to-br ${client.accent}`)}>
                        {client.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{client.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {hasLiveClientData
                          ? `${formatCurrency(spend, currency)} · ${live?.conversions.toLocaleString() ?? 0} conv.`
                          : "No synced data yet"}
                      </div>
                    </div>
                  </div>
                  {hasLiveClientData ? (
                    <Badge variant={spendDelta >= 0 ? "success" : "warning"}>
                      {spendDelta >= 0 ? "+" : ""}
                      {spendDelta.toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge variant="muted">Pending sync</Badge>
                  )}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {meta.hasLiveData
          ? `Showing connected sources only · ${connectors.filter((c) => c.status === "connected").length} connector${connectors.filter((c) => c.status === "connected").length === 1 ? "" : "s"} active · sync on demand`
          : "Dashboard shows live data only — no sample or estimated metrics are displayed"}
      </p>
    </>
  );
}
