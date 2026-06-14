"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { channels, type ChannelKey, type DailyPerformancePoint } from "@/lib/catalog";
import { PAID_SPEND_CHANNELS } from "@/lib/performance-data";
import { formatCompact } from "@/lib/utils";

export function PerformanceChart({
  data,
  activeChannels = [...PAID_SPEND_CHANNELS],
}: {
  data: DailyPerformancePoint[];
  activeChannels?: ChannelKey[];
}) {
  const seriesKeys = PAID_SPEND_CHANNELS.filter((channel) => activeChannels.includes(channel));

  if (seriesKeys.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Select a connected source to view spend.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
        <defs>
          {seriesKeys.map((k) => (
            <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={channels[k].color} stopOpacity="0.5" />
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
          tickFormatter={(v) => `$${formatCompact(v)}`}
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
            boxShadow: "0 6px 24px hsla(0 0% 0% / .12)",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}
          formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, channels[name as keyof typeof channels]?.short || name]}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => channels[v as keyof typeof channels]?.short || v}
        />
        {seriesKeys.map((k) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stackId="1"
            stroke={channels[k].color}
            strokeWidth={1.5}
            fill={`url(#grad-${k})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
