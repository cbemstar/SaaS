"use client";

import type { ReactNode } from "react";
import type { Config, SlotComponent } from "@measured/puck";
import DOMPurify from "isomorphic-dompurify";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReportData } from "@/components/report-builder/report-context";
import { applyStyle, styleField, DEFAULT_STYLE, type BlockStyle } from "@/components/report-builder/fields";
import { richTextField } from "@/components/report-builder/rich-text-field";
import { imageUploadField } from "@/components/report-builder/image-upload-field";
import { themeFields, themeStyle, type ReportTheme } from "@/components/report-builder/report-theme";
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

// Index signature keeps these compatible with Puck's loose render props type.
type StyleProp = { style?: BlockStyle } & Record<string, unknown>;

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

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
  const gradId = `rep-${source}-${metric}`;
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-2 text-sm font-semibold">{def.label} over time</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--report-accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--report-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={Math.max(0, Math.floor(series.length / 8))} />
          <YAxis tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={11} width={44} />
          <Tooltip formatter={(v: number) => formatMetric(source as MetricSource, metric, v, data?.currency)} />
          <Area type="monotone" dataKey="value" stroke="var(--report-accent)" strokeWidth={2} fill={`url(#${gradId})`} isAnimationActive={false} />
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

const HEADING_SIZE: Record<string, string> = { h1: "text-3xl", h2: "text-xl", h3: "text-base" };

export const reportConfig: Config = {
  root: {
    fields: themeFields,
    defaultProps: { brandColor: "", fontFamily: "", pageBackground: "", textColor: "", spacing: "comfortable" },
    render: ({ children, ...theme }: { children?: ReactNode } & ReportTheme & Record<string, unknown>) => (
      <div className="report-root rb-prose" style={themeStyle(theme)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--report-gap, 1.25rem)" }}>{children}</div>
      </div>
    ),
  },
  components: {
    Heading: {
      label: "Heading",
      fields: {
        text: { type: "text" },
        level: {
          type: "select",
          options: [
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
          ],
        },
        style: styleField,
      },
      defaultProps: { text: "Section heading", level: "h2", style: { ...DEFAULT_STYLE } },
      render: ({ text, level, style }: { text?: string; level?: string } & StyleProp) => {
        const Tag = (level ?? "h2") as "h1" | "h2" | "h3";
        return (
          <div style={applyStyle(style)}>
            <Tag className={`font-display font-semibold ${HEADING_SIZE[level ?? "h2"]}`}>{text}</Tag>
          </div>
        );
      },
    },
    RichText: {
      label: "Text",
      fields: { content: richTextField(), style: styleField },
      defaultProps: { content: "<p>Add your commentary here.</p>", style: { ...DEFAULT_STYLE } },
      render: ({ content, style }: { content?: string } & StyleProp) => (
        <div
          className="rb-prose text-sm leading-relaxed"
          style={applyStyle(style)}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content ?? "") }}
        />
      ),
    },
    Image: {
      label: "Image",
      fields: { url: imageUploadField(), alt: { type: "text" }, style: styleField },
      defaultProps: { url: "", alt: "", style: { ...DEFAULT_STYLE, align: "center", maxWidth: 0 } },
      render: ({ url, alt, style }: { url?: string; alt?: string } & StyleProp) =>
        url ? (
          <div style={{ textAlign: style?.align }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt ?? ""}
              style={{
                maxWidth: style?.maxWidth ? style.maxWidth : "100%",
                borderRadius: style?.radius || undefined,
                display: "inline-block",
              }}
            />
          </div>
        ) : (
          <Placeholder text="Upload an image or paste a URL" />
        ),
    },
    Divider: {
      label: "Divider",
      fields: { style: styleField },
      defaultProps: { style: { ...DEFAULT_STYLE } },
      render: ({ style }: StyleProp) => (
        <div style={applyStyle(style)}>
          <hr style={{ borderColor: style?.textColor || "hsl(var(--border))" }} />
        </div>
      ),
    },
    Spacer: {
      label: "Spacer",
      fields: { height: { type: "number", min: 0, max: 200 } },
      defaultProps: { height: 24 },
      render: ({ height }: { height?: number } & Record<string, unknown>) => <div style={{ height: height ?? 24 }} />,
    },
    Metric: {
      label: "Metric (KPI)",
      fields: {
        source: { type: "select", options: SOURCE_OPTIONS },
        metric: { type: "select", options: METRIC_OPTIONS },
        style: styleField,
      },
      defaultProps: { source: "ga4", metric: "sessions", style: { ...DEFAULT_STYLE } },
      render: ({ source, metric, style }: { source?: string; metric?: string } & StyleProp) => (
        <div style={applyStyle(style)}>
          <MetricBlock source={source ?? "ga4"} metric={metric ?? "sessions"} />
        </div>
      ),
    },
    Chart: {
      label: "Chart",
      fields: {
        source: { type: "select", options: SOURCE_OPTIONS },
        metric: { type: "select", options: METRIC_OPTIONS },
        style: styleField,
      },
      defaultProps: { source: "ga4", metric: "sessions", style: { ...DEFAULT_STYLE } },
      render: ({ source, metric, style }: { source?: string; metric?: string } & StyleProp) => (
        <div style={applyStyle(style)}>
          <ChartBlock source={source ?? "ga4"} metric={metric ?? "sessions"} />
        </div>
      ),
    },
    Breakdown: {
      label: "Breakdown table",
      fields: {
        source: { type: "select", options: SOURCE_OPTIONS },
        dimension: { type: "select", options: DIMENSION_OPTIONS },
        style: styleField,
      },
      defaultProps: { source: "ga4", dimension: "channel_group", style: { ...DEFAULT_STYLE } },
      render: ({ source, dimension, style }: { source?: string; dimension?: string } & StyleProp) => (
        <div style={applyStyle(style)}>
          <BreakdownBlock source={source ?? "ga4"} dimension={dimension ?? "channel_group"} />
        </div>
      ),
    },
    Columns: {
      label: "Columns",
      fields: {
        count: {
          type: "radio",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
          ],
        },
        gap: { type: "number", min: 0, max: 64 },
        colA: { type: "slot" },
        colB: { type: "slot" },
        colC: { type: "slot" },
        style: styleField,
      },
      defaultProps: { count: "2", gap: 16, colA: [], colB: [], colC: [], style: { ...DEFAULT_STYLE } },
      render: ({
        count,
        gap,
        colA,
        colB,
        colC,
        style,
      }: {
        count?: string;
        gap?: number;
        colA?: SlotComponent;
        colB?: SlotComponent;
        colC?: SlotComponent;
      } & StyleProp) => {
        const ColA = colA;
        const ColB = colB;
        const ColC = colC;
        return (
          <div className="rb-cols" style={{ display: "flex", gap: gap ?? 16, ...applyStyle(style) }}>
            <div style={{ flex: 1, minWidth: 0 }}>{ColA && <ColA />}</div>
            <div style={{ flex: 1, minWidth: 0 }}>{ColB && <ColB />}</div>
            {count === "3" && <div style={{ flex: 1, minWidth: 0 }}>{ColC && <ColC />}</div>}
          </div>
        );
      },
    },
  },
};
