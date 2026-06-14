"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { channels, type ChannelKey, type DailyPerformancePoint } from "@/lib/catalog";
import { PAID_SPEND_CHANNELS } from "@/lib/performance-data";
import { formatCurrency } from "@/lib/utils";

export function ChannelMix({
  data,
  activeChannels = [...PAID_SPEND_CHANNELS],
}: {
  data: DailyPerformancePoint[];
  activeChannels?: ChannelKey[];
}) {
  const seriesKeys = PAID_SPEND_CHANNELS.filter((channel) => activeChannels.includes(channel));
  const totals = seriesKeys.map((k) => ({
    name: channels[k].short,
    value: data.reduce((a, d) => a + d[k], 0),
    color: channels[k].color,
  }));
  const grand = totals.reduce((a, c) => a + c.value, 0);

  if (grand === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        No spend for selected sources.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 items-center gap-2">
      <div className="relative h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={totals}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={78}
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {totals.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => formatCurrency(v)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total spend</div>
          <div className="font-mono text-lg font-medium tabular-nums">{formatCurrency(grand)}</div>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {totals.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
            <span className="text-muted-foreground">{grand > 0 ? Math.round((s.value / grand) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
