import { Card } from "@/components/ui/card";
import { ChannelPill } from "@/components/channel-pill";
import { readDaily, readBreakdownRaw } from "@/lib/metrics/store";
import { channels } from "@/lib/catalog";
import {
  aggregateTotals,
  deltaPercent,
  formatMetric,
  getHeadlineMetrics,
  getMetricDef,
  getSourceDef,
  hasEcommerce,
  primaryBreakdown,
  resolveWindows,
  type MetricSource,
  type MetricTotals,
  type Scope,
} from "@/lib/metrics/catalog";
import { cn } from "@/lib/utils";

const WINDOW_DAYS = 30;

type AllSourcesOverviewProps = {
  workspaceId: string;
  scope: Scope;
  /** Sources that have data for this scope (from availableSources). */
  sources: MetricSource[];
  currency: string;
};

/**
 * At-a-glance view across EVERY connected source: one card per source with its
 * headline KPIs (vs the previous period) and its top breakdown rows. Each card
 * is badged + accent-coloured by source so it's clear which platform the data is
 * from. Server-rendered; each source card fetches concurrently.
 */
export async function AllSourcesOverview({ workspaceId, scope, sources, currency }: AllSourcesOverviewProps) {
  if (!sources.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold">All sources</h2>
        <p className="text-sm text-muted-foreground">
          Headline metrics and top breakdowns across every connected source · last {WINDOW_DAYS} days
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {sources.map((source) => (
          <SourceSummaryCard
            key={source}
            workspaceId={workspaceId}
            scope={scope}
            source={source}
            currency={currency}
          />
        ))}
      </div>
    </section>
  );
}

async function SourceSummaryCard({
  workspaceId,
  scope,
  source,
  currency,
}: {
  workspaceId: string;
  scope: Scope;
  source: MetricSource;
  currency: string;
}) {
  const [daily, breakdowns] = await Promise.all([
    readDaily(workspaceId, scope, source),
    readBreakdownRaw(workspaceId, scope, source),
  ]);
  if (!daily.length) return null;

  const def = getSourceDef(source);
  const { current, previous, start, end } = resolveWindows(daily, { days: WINDOW_DAYS, compare: "previous" });
  const currentTotals = aggregateTotals(source, current.map((p) => p.metrics));
  const previousTotals = aggregateTotals(source, previous.map((p) => p.metrics));
  const showEcommerce = hasEcommerce(source, aggregateTotals(source, daily.map((p) => p.metrics)));
  const headline = getHeadlineMetrics(source, showEcommerce, 4);

  // Top breakdown rows for the source's primary dimension, within the window.
  const bd = primaryBreakdown(source);
  let topRows: Array<{ label: string; value: number }> = [];
  if (bd) {
    const agg = new Map<string, number>();
    for (const row of breakdowns) {
      if (row.dimension_type !== bd.dimension.type) continue;
      if (row.date < start || row.date > end) continue;
      agg.set(row.dimension_value, (agg.get(row.dimension_value) ?? 0) + (row.metrics[bd.metric] ?? 0));
    }
    topRows = [...agg.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }

  const accent = channels[source]?.color;

  return (
    <Card className="space-y-4 p-4" style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ChannelPill channel={source} />
          <span className="text-sm font-semibold">{def?.label ?? source}</span>
        </div>
        <span className="text-2xs uppercase tracking-wide text-muted-foreground">Last {WINDOW_DAYS} days</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {headline.map((key) => (
          <SourceKpi
            key={key}
            source={source}
            metricKey={key}
            current={currentTotals}
            previous={previousTotals}
            currency={currency}
          />
        ))}
      </div>

      {bd && topRows.length > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Top {bd.dimension.label.toLowerCase()}</span>
            <span>{getMetricDef(source, bd.metric)?.short ?? bd.metric}</span>
          </div>
          <div className="overflow-hidden rounded-md border">
            {topRows.map((row, index) => (
              <div
                key={row.label || index}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-1.5 text-sm",
                  index > 0 && "border-t",
                )}
              >
                <span className="min-w-0 truncate text-muted-foreground">{row.label || "—"}</span>
                <span className="shrink-0 font-mono tabular-nums">
                  {formatMetric(source, bd.metric, row.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function SourceKpi({
  source,
  metricKey,
  current,
  previous,
  currency,
}: {
  source: MetricSource;
  metricKey: string;
  current: MetricTotals;
  previous: MetricTotals;
  currency: string;
}) {
  const def = getMetricDef(source, metricKey);
  const value = formatMetric(source, metricKey, current[metricKey] ?? 0, currency);
  const delta = deltaPercent(current[metricKey] ?? 0, previous[metricKey] ?? 0);
  const higherIsBetter = def?.higherIsBetter ?? true;
  const positive = delta !== null && (higherIsBetter ? delta >= 0 : delta < 0);

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="truncate text-xs text-muted-foreground">{def?.label ?? metricKey}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</p>
      {delta !== null ? (
        <span className={cn("font-mono text-2xs tabular-nums", positive ? "text-success" : "text-destructive")}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      ) : (
        <span className="text-2xs text-muted-foreground">No prior period</span>
      )}
    </div>
  );
}
