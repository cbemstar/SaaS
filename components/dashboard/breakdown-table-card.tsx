"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DIMENSION_META,
  formatMetric,
  rankBreakdown,
  type Ga4BreakdownRaw,
  type Ga4DimensionType,
  type Ga4Filter,
} from "@/lib/ga4-aggregate";

type BreakdownTableCardProps = {
  dimensionType: Ga4DimensionType;
  rows: Ga4BreakdownRaw[];
  filter: Ga4Filter;
  onFilter?: (value: string | null) => void;
};

export function BreakdownTableCard({ dimensionType, rows, filter, onFilter }: BreakdownTableCardProps) {
  const meta = DIMENSION_META[dimensionType];
  const entries = rankBreakdown(rows, dimensionType, 8);
  const max = entries[0]?.sessions ?? 0;
  const interactive = meta.filterable && Boolean(onFilter);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top {meta.label.toLowerCase()}s</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => {
              const active = filter?.dimensionType === dimensionType && filter.value === entry.value;
              const pct = max > 0 ? (entry.sessions / max) * 100 : 0;
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
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-primary/10"
                    style={{ width: `${pct}%` }}
                  />
                  <span className="relative z-10 truncate" title={entry.value}>
                    {entry.value || "(not set)"}
                  </span>
                  <span className="relative z-10 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatMetric("sessions", entry.sessions)}
                  </span>
                </Row>
              );
            })}
          </div>
        )}
        {interactive && (
          <p className="mt-2 text-[11px] text-muted-foreground">Tap a row to filter the dashboard.</p>
        )}
      </CardContent>
    </Card>
  );
}
