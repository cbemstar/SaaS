"use client";

import type { ReactNode } from "react";
import {
  Filter,
  LayoutGrid,
  LineChart,
  ListChecks,
  PieChart,
  Sparkles,
  Square,
  Table,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { PerformanceChart } from "@/components/performance-chart";
import { ConversionsChart } from "@/components/conversions-chart";
import { ChannelMix } from "@/components/channel-mix";
import { reportBlockMeta } from "@/lib/report-blocks";
import type { Client, DailyPerformancePoint } from "@/lib/catalog";
import { formatCurrency } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  Sparkles,
  LineChart,
  PieChart,
  TrendingUp,
  Table,
  Filter,
  ListChecks,
  Square,
};

type ReportBuilderCanvasProps = {
  client: Client;
  blocks: string[];
  dailyPerformance: DailyPerformancePoint[];
  workspaceName: string;
  headerStyle?: React.CSSProperties;
};

function BlockIcon({ id }: { id: string }) {
  const meta = reportBlockMeta(id);
  const Icon = iconMap[meta.icon] ?? Square;
  return <Icon className="h-3.5 w-3.5" />;
}

export function ReportBuilderCanvas({
  client,
  blocks,
  dailyPerformance,
  workspaceName,
  headerStyle,
}: ReportBuilderCanvasProps) {
  const cpa = client.conversions > 0 ? Math.round(client.monthlySpend / client.conversions) : 0;

  function renderBlock(blockId: string) {
    switch (blockId) {
      case "kpi":
        return (
          <section key={blockId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {reportBlockMeta(blockId).label}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { l: "Spend", v: formatCurrency(client.monthlySpend), d: `+${client.spendDelta}%` },
                { l: "Conversions", v: client.conversions.toLocaleString(), d: `+${client.conversionsDelta}%` },
                { l: "ROAS", v: `${client.roas.toFixed(1)}×`, d: "+6.3%" },
                { l: "CPA", v: formatCurrency(cpa), d: "-8.1%" },
              ].map((k) => (
                <div key={k.l} className="rounded-md border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                  <div className="font-display text-lg font-semibold tabular-nums">{k.v}</div>
                  <div className="text-[11px] font-medium text-success">{k.d}</div>
                </div>
              ))}
            </div>
          </section>
        );
      case "ai":
        return (
          <section key={blockId} className="rounded-md border border-primary/20 bg-primary/[0.04] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {reportBlockMeta(blockId).label}
            </div>
            <p className="text-pretty text-sm leading-relaxed text-foreground/85">
              {client.name} performance summary will be generated from live connector data once synced. Recommendations
              cite source metrics and respect your AI engine settings.
            </p>
          </section>
        );
      case "perf":
        return (
          <section key={blockId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {reportBlockMeta(blockId).label}
            </h2>
            <div className="rounded-md border bg-background p-3">
              <PerformanceChart data={dailyPerformance} />
            </div>
          </section>
        );
      case "mix":
        return (
          <section key={blockId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {reportBlockMeta(blockId).label}
            </h2>
            <div className="rounded-md border bg-background p-3">
              <ChannelMix data={dailyPerformance} />
            </div>
          </section>
        );
      case "conv":
        return (
          <section key={blockId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {reportBlockMeta(blockId).label}
            </h2>
            <div className="rounded-md border bg-background p-3">
              <ConversionsChart data={dailyPerformance} />
            </div>
          </section>
        );
      case "table":
        return (
          <section key={blockId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {reportBlockMeta(blockId).label}
            </h2>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Campaign</th>
                    <th className="px-3 py-2">Spend</th>
                    <th className="px-3 py-2">Conv.</th>
                    <th className="px-3 py-2">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {["Brand search", "Retargeting", "Prospecting broad"].map((name, index) => (
                    <tr key={name} className="border-t">
                      <td className="px-3 py-2 font-medium">{name}</td>
                      <td className="px-3 py-2 tabular-nums">{formatCurrency(4200 - index * 900)}</td>
                      <td className="px-3 py-2 tabular-nums">{142 - index * 28}</td>
                      <td className="px-3 py-2 tabular-nums">{formatCurrency(29 + index * 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      case "funnel":
        return (
          <section key={blockId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {reportBlockMeta(blockId).label}
            </h2>
            <div className="space-y-2">
              {[
                { stage: "Impressions", value: "1.24M", pct: 100 },
                { stage: "Clicks", value: "38.4K", pct: 72 },
                { stage: "Conversions", value: client.conversions.toLocaleString(), pct: 48 },
              ].map((row) => (
                <div key={row.stage} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted-foreground">{row.stage}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs font-medium tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </section>
        );
      case "recommendations":
        return (
          <section key={blockId}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {reportBlockMeta(blockId).label}
            </h2>
            <ol className="space-y-2 text-sm">
              {[
                "Shift 12% of Meta spend into top-performing retargeting ad sets.",
                "Pause low-CTR prospecting creative set B; CPA is 34% above account average.",
                "Increase Google brand search budget cap — impression share lost to rank at 18%.",
              ].map((item, index) => (
                <li key={item} className="flex gap-2 rounded-md border bg-background px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      default:
        return null;
    }
  }

  const mixAndConvTogether =
    blocks.includes("mix") && blocks.includes("conv") && blocks.indexOf("mix") + 1 === blocks.indexOf("conv");

  const rendered: ReactNode[] = [];
  let index = 0;
  while (index < blocks.length) {
    const blockId = blocks[index];
    if (mixAndConvTogether && blockId === "mix") {
      rendered.push(
        <section key="mix-conv" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-background p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BlockIcon id="mix" /> {reportBlockMeta("mix").label}
            </div>
            <ChannelMix data={dailyPerformance} />
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BlockIcon id="conv" /> {reportBlockMeta("conv").label}
            </div>
            <ConversionsChart data={dailyPerformance} />
          </div>
        </section>,
      );
      index += 2;
      continue;
    }
    if (mixAndConvTogether && blockId === "conv") {
      index += 1;
      continue;
    }
    const node = renderBlock(blockId);
    if (node) rendered.push(node);
    index += 1;
  }

  return (
    <div className="mx-auto max-w-3xl rounded-md border bg-card shadow-md">
      <div
        className="flex items-center justify-between rounded-t-md p-6 text-white"
        style={headerStyle ?? { backgroundColor: "#1f6f5c" }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-90">{client.name}</div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Performance Report</h1>
          <div className="mt-1 text-xs opacity-80">May 2026 · Prepared by {workspaceName}</div>
        </div>
      </div>
      <div className="space-y-6 p-6">{rendered}</div>
    </div>
  );
}
