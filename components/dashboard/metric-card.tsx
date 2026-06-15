"use client";

import { GripVertical, Maximize2, X } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { deltaPercent, formatMetric, getMetricDef, type CardSize, type MetricSource } from "@/lib/metrics/catalog";

export type MetricCardProps = {
  source: MetricSource;
  metric: string;
  size: CardSize;
  current: number;
  previous: number;
  series: Array<{ label: string; value: number }>;
  currency: string;
  available: boolean;
  editing: boolean;
  onResize?: () => void;
  onRemove?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

const SIZE_LABEL: Record<CardSize, string> = { sm: "S", md: "M", lg: "L" };

export function MetricCard({
  source,
  metric,
  size,
  current,
  previous,
  series,
  currency,
  available,
  editing,
  onResize,
  onRemove,
  dragHandleProps,
}: MetricCardProps) {
  const def = getMetricDef(source, metric);
  const label = def?.label ?? metric;
  const higherIsBetter = def?.higherIsBetter ?? true;
  const delta = available ? deltaPercent(current, previous) : null;
  const positive = delta !== null && (higherIsBetter ? delta >= 0 : delta < 0);

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-xl border bg-card p-4 shadow-panel">
      {editing && (
        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5">
          <button
            type="button"
            onClick={onResize}
            aria-label={`Resize ${label} (currently ${SIZE_LABEL[size]})`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted active:scale-95"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Drag ${label}`}
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      {available ? (
        <>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {formatMetric(source, metric, current, currency)}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            {delta !== null ? (
              <span className={cn("font-mono text-xs tabular-nums", positive ? "text-success" : "text-destructive")}>
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No prior period</span>
            )}
            {size !== "sm" && series.length > 1 && (
              <div className="h-8 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`spark-${metric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5}
                      fill={`url(#spark-${metric})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Not available with this filter</p>
      )}
    </div>
  );
}
