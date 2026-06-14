"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { channels, type ChannelKey, type DailyPerformancePoint } from "@/lib/catalog";
import { formatCompact } from "@/lib/utils";

const ORGANIC_CHANNELS = ["ga4", "search_console"] as const;

export function OrganicMetricsChart({
  data,
  activeChannels,
}: {
  data: DailyPerformancePoint[];
  activeChannels: ChannelKey[];
}) {
  const seriesKeys = ORGANIC_CHANNELS.filter((channel) => activeChannels.includes(channel));

  if (seriesKeys.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Connect GA4 or Search Console to view organic metrics.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
        <defs>
          {seriesKeys.map((k) => (
            <linearGradient key={k} id={`organic-grad-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={channels[k].color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={channels[k].color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          interval={3}
        />
        <YAxis
          tickFormatter={(v) => formatCompact(v)}
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number, name: string) => {
            const channel = channels[name as keyof typeof channels];
            const unit = name === "ga4" ? "sessions" : "clicks";
            return [`${v.toLocaleString()} ${unit}`, channel?.short ?? name];
          }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => {
            const channel = channels[v as keyof typeof channels];
            return v === "ga4" ? `${channel?.short} sessions` : `${channel?.short} clicks`;
          }}
        />
        {seriesKeys.map((k) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stackId="organic"
            stroke={channels[k].color}
            strokeWidth={1.5}
            fill={`url(#organic-grad-${k})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
