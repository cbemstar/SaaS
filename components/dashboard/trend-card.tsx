"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMetricDef, type MetricSource } from "@/lib/metrics/catalog";

// recharts loads lazily after mount so it stays out of the dashboard's initial bundle.
const TrendCardChart = dynamic(
  () => import("./trend-card-chart").then((m) => m.TrendCardChart),
  {
    ssr: false,
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-md bg-muted/40" />,
  },
);

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
          <TrendCardChart source={source} metric={metric} series={series} currency={currency} />
        ) : (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Not enough data to plot a trend yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
