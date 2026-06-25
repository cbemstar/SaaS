"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact } from "@/lib/utils";
import { formatMetric, getMetricDef, type MetricSource } from "@/lib/metrics/catalog";

/** The AreaChart from TrendCard, split out so recharts loads lazily off the initial bundle. */
export function TrendCardChart({
  source,
  metric,
  series,
  currency,
}: {
  source: MetricSource;
  metric: string;
  series: Array<{ label: string; value: number }>;
  currency: string;
}) {
  const def = getMetricDef(source, metric);
  const label = def?.label ?? metric;
  const isPercent = def?.format === "percent";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={series} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          interval={Math.max(0, Math.floor(series.length / 8))}
        />
        <YAxis
          tickFormatter={(v) => (isPercent ? `${Math.round(v * 100)}%` : formatCompact(v))}
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          formatter={(value: number) => [formatMetric(source, metric, value, currency), def?.short ?? label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#trend-grad)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
