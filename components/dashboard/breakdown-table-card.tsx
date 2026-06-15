"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatMetric,
  getSourceDef,
  rankBreakdown,
  type BreakdownRaw,
  type MetricFilter,
  type MetricSource,
} from "@/lib/metrics/catalog";

type BreakdownTableCardProps = {
  source: MetricSource;
  dimensionType: string;
  rows: BreakdownRaw[];
  filter: MetricFilter;
  onFilter?: (value: string | null) => void;
};

export function BreakdownTableCard({ source, dimensionType, rows, filter, onFilter }: BreakdownTableCardProps) {
  const def = getSourceDef(source);
  const dim = def?.dimensions.find((d) => d.type === dimensionType);
  const primaryKey = def?.breakdownMetrics[0] ?? "sessions";
  const entries = rankBreakdown(source, rows, dimensionType, 8);
  const max = entries[0]?.metrics[primaryKey] ?? 0;
  const interactive = Boolean(dim?.filterable) && Boolean(onFilter);
  const label = dim?.label ?? dimensionType;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top {label.toLowerCase()}s</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => {
              const active = filter?.dimensionType === dimensionType && filter.value === entry.value;
              const value = entry.metrics[primaryKey] ?? 0;
              const pct = max > 0 ? (value / max) * 100 : 0;
              const Row = interactive ? "button" : "div";
              return (
                <Row
                  key={entry.value}
                  type={interactive ? "button" : undefined}
                  onClick={interactive ? () => onFilter?.(active ? null : entry.value) : undefined}
                  className={cn(
                    "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md px-2 py-1.5 text-left text-sm",
                    interactive && "transition-colors hover:bg-muted/60",
                    active && "ring-1 ring-primary",
                  )}
                >
                  <span aria-hidden className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} />
                  <span className="relative z-10 truncate" title={entry.value}>
                    {entry.value || "(not set)"}
                  </span>
                  <span className="relative z-10 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatMetric(source, primaryKey, value)}
                  </span>
                </Row>
              );
            })}
          </div>
        )}
        {interactive && <p className="mt-2 text-[11px] text-muted-foreground">Tap a row to filter the dashboard.</p>}
      </CardContent>
    </Card>
  );
}
