"use client";

import type { Config } from "@measured/puck";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReportData } from "@/components/report-builder/report-context";
import {
  SOURCES,
  deltaPercent,
  formatMetric,
  getMetricDef,
  getSourceDef,
  rankBreakdown,
  type MetricSource,
} from "@/lib/metrics/catalog";
import { formatCompact } from "@/lib/utils";

const SOURCE_OPTIONS = (Object.keys(SOURCES) as MetricSource[])
  .filter((s) => getSourceDef(s))
  .map((s) => ({ label: getSourceDef(s)!.label, value: s }));

const METRIC_OPTIONS = (() => {
  const seen = new Map<string, string>();
  for (const source of Object.keys(SOURCES) as MetricSource[]) {
    for (const metric of getSourceDef(source)?.metrics ?? []) {
      if (!metric.hidden && !seen.has(metric.key)) seen.set(metric.key, metric.label);
    }
  }
  return [...seen.entries()].map(([value, label]) => ({ label, value }));
})();

const DIMENSION_OPTIONS = (() => {
  const seen = new Map<string, string>();
  for (const source of Object.keys(SOURCES) as MetricSource[]) {
    for (const dim of getSourceDef(source)?.dimensions ?? []) {
      if (!seen.has(dim.type)) seen.set(dim.type, dim.label);
    }
  }
  return [...seen.entries()].map(([value, label]) => ({ label, value }));
})();

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

type BlockData = {
  Heading: { text: string; align: "left" | "center" };
  Paragraph: { text: string };
  Image: { url: string; alt: string; maxHeight: number };
  Divider: Record<string, never>;
  Spacer: { height: number };
  Metric: { source: string; metric: string };
  Chart: { source: string; metric: string };
  Breakdown: { source: string; dimension: string };
};

function MetricBlock({ source, metric }: { source: string; metric: string }) {
  const data = useReportData();
  const sd = data?.sources[source as MetricSource];
  const def = getMetricDef(source as MetricSource, metric);
  if (!sd || !def) return <Placeholder text="Select a source and metric with data" />;
  const value = sd.totals[metric] ?? 0;
  const delta = deltaPercent(value, sd.previousTotals[metric] ?? 0);
  const positive = delta !== null && (def.higherIsBetter ? delta >= 0 : delta < 0);
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{def.label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {formatMetric(source as MetricSource, metric, value, data?.currency)}
      </p>
      {delta !== null && (
        <span className={`font-mono text-xs ${positive ? "text-success" : "text-destructive"}`}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function ChartBlock({ source, metric }: { source: string; metric: string }) {
  const data = useReportData();
  const sd = data?.sources[source as MetricSource];
  const def = getMetricDef(source as MetricSource, metric);
  if (!sd || !def) return <Placeholder text="Select a source and metric with data" />;
  const series = sd.daily.map((p) => ({ label: p.label, value: p.metrics[metric] ?? 0 }));
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-2 text-sm font-semibold">{def.label} over time</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={`rep-${source}-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={Math.max(0, Math.floor(series.length / 8))} />
          <YAxis tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={11} width={44} />
          <Tooltip formatter={(v: number) => formatMetric(source as MetricSource, metric, v, data?.currency)} />
          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#rep-${source}-${metric})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BreakdownBlock({ source, dimension }: { source: string; dimension: string }) {
  const data = useReportData();
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  if (!sd || !def) return <Placeholder text="Select a source with data" />;
  const primary = def.breakdownMetrics[0] ?? "sessions";
  const entries = rankBreakdown(source as MetricSource, sd.breakdowns, dimension, 8);
  if (!entries.length) return <Placeholder text="No breakdown data" />;
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-2 text-sm font-semibold">
        Top {def.dimensions.find((d) => d.type === dimension)?.label.toLowerCase() ?? dimension}s
      </p>
      <table className="w-full text-sm">
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.value} className="border-b border-border/50 last:border-0">
              <td className="truncate py-1.5 pr-4">{entry.value || "(not set)"}</td>
              <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {formatMetric(source as MetricSource, primary, entry.metrics[primary] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const reportConfig: Config<BlockData> = {
  root: {
    render: ({ children }) => <div className="space-y-4">{children}</div>,
  },
  components: {
    Heading: {
      label: "Heading",
      fields: {
        text: { type: "text" },
        align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
      },
      defaultProps: { text: "Section heading", align: "left" },
      render: ({ text, align }) => (
        <h2 className={`font-display text-xl font-semibold ${align === "center" ? "text-center" : ""}`}>{text}</h2>
      ),
    },
    Paragraph: {
      label: "Text",
      fields: { text: { type: "textarea" } },
      defaultProps: { text: "Add your commentary here." },
      render: ({ text }) => <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{text}</p>,
    },
    Image: {
      label: "Image",
      fields: {
        url: { type: "text" },
        alt: { type: "text" },
        maxHeight: { type: "number" },
      },
      defaultProps: { url: "", alt: "", maxHeight: 240 },
      render: ({ url, alt, maxHeight }) =>
        url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt} style={{ maxHeight, width: "auto" }} className="rounded-lg" />
        ) : (
          <Placeholder text="Add an image URL" />
        ),
    },
    Divider: {
      label: "Divider",
      fields: {},
      render: () => <hr className="border-border" />,
    },
    Spacer: {
      label: "Spacer",
      fields: { height: { type: "number" } },
      defaultProps: { height: 24 },
      render: ({ height }) => <div style={{ height }} />,
    },
    Metric: {
      label: "Metric (KPI)",
      fields: {
        source: { type: "select", options: SOURCE_OPTIONS },
        metric: { type: "select", options: METRIC_OPTIONS },
      },
      defaultProps: { source: "ga4", metric: "sessions" },
      render: ({ source, metric }) => <MetricBlock source={source} metric={metric} />,
    },
    Chart: {
      label: "Chart",
      fields: {
        source: { type: "select", options: SOURCE_OPTIONS },
        metric: { type: "select", options: METRIC_OPTIONS },
      },
      defaultProps: { source: "ga4", metric: "sessions" },
      render: ({ source, metric }) => <ChartBlock source={source} metric={metric} />,
    },
    Breakdown: {
      label: "Breakdown table",
      fields: {
        source: { type: "select", options: SOURCE_OPTIONS },
        dimension: { type: "select", options: DIMENSION_OPTIONS },
      },
      defaultProps: { source: "ga4", dimension: "channel_group" },
      render: ({ source, dimension }) => <BreakdownBlock source={source} dimension={dimension} />,
    },
  },
};
