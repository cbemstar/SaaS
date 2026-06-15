"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCompact } from "@/lib/utils";
import { formatMetric, getMetricDef, type MetricSource } from "@/lib/metrics/catalog";

type TrendCardProps = {
  source: MetricSource;
  metric: string;
  series: Array<{ label: string; value: number }>;
  options: string[];
  currency: string;
  onMetricChange: (metric: string) => void;
};

export function TrendCard({ source, metric, series, options, currency, onMetricChange }: TrendCardProps) {
  const def = getMetricDef(source, metric);
  const label = def?.label ?? metric;
  const isPercent = def?.format === "percent";

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{label} over time</CardTitle>
        <Select value={metric} onValueChange={onMetricChange}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((key) => (
              <SelectItem key={key} value={key} className="text-xs">
                {getMetricDef(source, key)?.label ?? key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {series.length > 1 ? (
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
        ) : (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Not enough data to plot a trend yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
