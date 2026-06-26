"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import DOMPurify from "isomorphic-dompurify";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import { applyStyle, type BlockStyle } from "@/components/report-builder/fields";
import { RichTextEditor } from "@/components/report-builder/rich-text-field";
import { ImageUploadField } from "@/components/report-builder/image-upload-field";
import { Labeled, SelectControl, StylePanel, TextControl } from "@/components/report-builder/controls";

// Distinct categorical palette for pie/donut slices (Looker-style).
const CHART_COLORS = [
  "var(--report-accent)",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
];
import type { ReportData } from "@/lib/report-builder/types";
import {
  SOURCES,
  deltaPercent,
  formatDayLabel,
  formatMetric,
  getMetricDef,
  getSourceDef,
  rankBreakdown,
  type MetricSource,
} from "@/lib/metrics/catalog";
import { formatCompact } from "@/lib/utils";

import type { Cfg, ComponentType, EditorCtx, ReportItem, ReportLayoutV2 } from "@/lib/report-builder/layout";

export type { Cfg, ComponentType, EditorCtx, ReportItem, ReportLayoutV2 };
export { isV2 } from "@/lib/report-builder/layout";

const str = (c: Cfg, k: string, d = "") => (typeof c[k] === "string" ? (c[k] as string) : d);
const arr = (c: Cfg, k: string) => (Array.isArray(c[k]) ? (c[k] as string[]) : []);
const styleOf = (c: Cfg): BlockStyle => (c.style as BlockStyle) ?? {};

const SOURCE_OPTIONS = (Object.keys(SOURCES) as MetricSource[])
  .filter((s) => getSourceDef(s))
  .map((s) => ({ label: getSourceDef(s)!.label, value: s }));

const metricOptions = (source: string) =>
  (getSourceDef(source as MetricSource)?.metrics ?? [])
    .filter((m) => !m.hidden)
    .map((m) => ({ label: m.label, value: m.key }));

const dimensionOptions = (source: string) =>
  (getSourceDef(source as MetricSource)?.dimensions ?? []).map((d) => ({ label: d.label, value: d.type }));

// --- Render helpers ---------------------------------------------------------

function Empty({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{text}</div>;
}

function KpiView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const metric = str(config, "metric", "sessions");
  const sd = data?.sources[source as MetricSource];
  const def = getMetricDef(source as MetricSource, metric);
  if (!sd || !def) return <Empty text="Pick a source & metric" />;
  const value = sd.totals[metric] ?? 0;
  const delta = deltaPercent(value, sd.previousTotals[metric] ?? 0);
  const positive = delta !== null && (def.higherIsBetter ? delta >= 0 : delta < 0);
  return (
    <div>
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

function ChartView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const metric = str(config, "metric", "sessions");
  const chartType = str(config, "chartType", "area");
  const sd = data?.sources[source as MetricSource];
  const def = getMetricDef(source as MetricSource, metric);
  if (!sd || !def) return <Empty text="Pick a source & metric" />;
  const series = sd.daily.map((p) => ({ label: p.label, value: p.metrics[metric] ?? 0 }));
  const gradId = `g-${source}-${metric}`;
  const axes = (
    <>
      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={Math.max(0, Math.floor(series.length / 7))} />
      <YAxis tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={10} width={40} />
      <Tooltip formatter={(v: number) => formatMetric(source as MetricSource, metric, v, data?.currency)} />
    </>
  );
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 text-sm font-semibold">{def.label}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              {axes}
              <Bar dataKey="value" fill="var(--report-accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              {axes}
              <Line type="monotone" dataKey="value" stroke="var(--report-accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          ) : (
            <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--report-accent)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--report-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {axes}
              <Area type="monotone" dataKey="value" stroke="var(--report-accent)" strokeWidth={2} fill={`url(#${gradId})`} isAnimationActive={false} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PieView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const dimension = str(config, "dimension", "channel_group");
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  if (!sd || !def) return <Empty text="Pick a source" />;
  const metric = str(config, "metric", def.breakdownMetrics[0] ?? "sessions");
  const entries = rankBreakdown(source as MetricSource, sd.breakdowns, dimension, 6);
  const slices = entries.map((e) => ({ name: e.value || "(not set)", value: e.metrics[metric] ?? 0 })).filter((s) => s.value > 0);
  if (!slices.length) return <Empty text="No breakdown data" />;
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 text-sm font-semibold">
        {getMetricDef(source as MetricSource, metric)?.label ?? metric} by {def.dimensions.find((d) => d.type === dimension)?.label.toLowerCase() ?? dimension}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="80%" paddingAngle={2} isAnimationActive={false}>
              {slices.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatMetric(source as MetricSource, metric, v, data?.currency)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TableView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const dimension = str(config, "dimension", "channel_group");
  const metrics = arr(config, "metrics");
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  if (!sd || !def) return <Empty text="Pick a source" />;
  const cols = (metrics.length ? metrics : def.breakdownMetrics.slice(0, 3)).filter((m) => def.breakdownMetrics.includes(m));
  const entries = rankBreakdown(source as MetricSource, sd.breakdowns, dimension, 10);
  if (!entries.length || !cols.length) return <Empty text="No breakdown data" />;
  return (
    <div className="overflow-auto">
      <p className="mb-1 text-sm font-semibold">
        {def.dimensions.find((d) => d.type === dimension)?.label ?? dimension}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-1 pr-3 text-left font-medium">{def.dimensions.find((d) => d.type === dimension)?.label ?? dimension}</th>
            {cols.map((m) => (
              <th key={m} className="py-1 pl-3 text-right font-medium">{getMetricDef(source as MetricSource, m)?.short ?? m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.value} className="border-b border-border/50 last:border-0">
              <td className="truncate py-1 pr-3">{e.value || "(not set)"}</td>
              {cols.map((m) => (
                <td key={m} className="py-1 pl-3 text-right font-mono tabular-nums text-muted-foreground">
                  {formatMetric(source as MetricSource, m, e.metrics[m] ?? 0, data?.currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BreakdownView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const dimension = str(config, "dimension", "channel_group");
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  if (!sd || !def) return <Empty text="Pick a source" />;
  const primary = def.breakdownMetrics[0] ?? "sessions";
  const entries = rankBreakdown(source as MetricSource, sd.breakdowns, dimension, 8);
  if (!entries.length) return <Empty text="No breakdown data" />;
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">
        Top {def.dimensions.find((d) => d.type === dimension)?.label.toLowerCase() ?? dimension}s
      </p>
      <table className="w-full text-sm">
        <tbody>
          {entries.map((e) => (
            <tr key={e.value} className="border-b border-border/50 last:border-0">
              <td className="truncate py-1 pr-3">{e.value || "(not set)"}</td>
              <td className="py-1 text-right font-mono tabular-nums text-muted-foreground">
                {formatMetric(source as MetricSource, primary, e.metrics[primary] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricGridView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const metrics = arr(config, "metrics");
  const sd = data?.sources[source as MetricSource];
  if (!sd || !metrics.length) return <Empty text="Pick metrics" />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((m) => {
        const def = getMetricDef(source as MetricSource, m);
        if (!def) return null;
        return (
          <div key={m} className="rounded-lg border bg-card/50 p-2">
            <p className="text-[11px] text-muted-foreground">{def.label}</p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {formatMetric(source as MetricSource, m, sd.totals[m] ?? 0, data?.currency)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ComboView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "google_ads");
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  if (!sd || !def) return <Empty text="Pick a source" />;
  const barMetric = str(config, "barMetric", def.breakdownMetrics[0] ?? "clicks");
  const lineMetric = str(config, "lineMetric", def.metrics.find((m) => m.key !== barMetric)?.key ?? barMetric);
  const barDef = getMetricDef(source as MetricSource, barMetric);
  const lineDef = getMetricDef(source as MetricSource, lineMetric);
  const series = sd.daily.map((p) => ({ label: p.label, bar: p.metrics[barMetric] ?? 0, line: p.metrics[lineMetric] ?? 0 }));
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 text-sm font-semibold">{barDef?.label} & {lineDef?.label}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={Math.max(0, Math.floor(series.length / 7))} />
            <YAxis yAxisId="l" tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <YAxis yAxisId="r" orientation="right" tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <Tooltip formatter={(v: number) => formatCompact(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" dataKey="bar" name={barDef?.short ?? "Bar"} fill="var(--report-accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Line yAxisId="r" type="monotone" dataKey="line" name={lineDef?.short ?? "Line"} stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StackedView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const dimension = str(config, "dimension", "channel_group");
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  if (!sd || !def) return <Empty text="Pick a source" />;
  const metric = str(config, "metric", def.breakdownMetrics[0] ?? "sessions");
  const top = rankBreakdown(source as MetricSource, sd.breakdowns, dimension, 6).map((e) => e.value);
  if (!top.length) return <Empty text="No breakdown data" />;
  const topSet = new Set(top);
  const byDate = new Map<string, Record<string, number | string>>();
  for (const row of sd.breakdowns) {
    if (row.dimension_type !== dimension || !topSet.has(row.dimension_value)) continue;
    let rec = byDate.get(row.date);
    if (!rec) {
      rec = { date: row.date };
      byDate.set(row.date, rec);
    }
    const key = row.dimension_value || "(not set)";
    rec[key] = ((rec[key] as number) ?? 0) + (row.metrics[metric] ?? 0);
  }
  const series = [...byDate.values()]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((r) => ({ ...r, label: formatDayLabel(String(r.date)) }));
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 text-sm font-semibold">
        {getMetricDef(source as MetricSource, metric)?.label ?? metric} by {def.dimensions.find((d) => d.type === dimension)?.label.toLowerCase() ?? dimension}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={Math.max(0, Math.floor(series.length / 7))} />
            <YAxis tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <Tooltip formatter={(v: number) => formatCompact(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {top.map((value, i) => (
              <Area
                key={value || i}
                type="monotone"
                dataKey={value || "(not set)"}
                stackId="1"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.7}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ScatterView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "google_ads");
  const dimension = str(config, "dimension", "campaign");
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  if (!sd || !def) return <Empty text="Pick a source" />;
  const xMetric = str(config, "xMetric", def.breakdownMetrics[0] ?? "clicks");
  const yMetric = str(config, "yMetric", def.breakdownMetrics[1] ?? def.breakdownMetrics[0] ?? "conversions");
  const xDef = getMetricDef(source as MetricSource, xMetric);
  const yDef = getMetricDef(source as MetricSource, yMetric);
  const points = rankBreakdown(source as MetricSource, sd.breakdowns, dimension, 30)
    .map((e) => ({ x: e.metrics[xMetric] ?? 0, y: e.metrics[yMetric] ?? 0, name: e.value || "(not set)" }))
    .filter((p) => p.x > 0 || p.y > 0);
  if (!points.length) return <Empty text="No breakdown data" />;
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 text-sm font-semibold">{xDef?.short ?? xMetric} vs {yDef?.short ?? yMetric}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={xDef?.short ?? xMetric} tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={10} />
            <YAxis type="number" dataKey="y" name={yDef?.short ?? yMetric} tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(v: number) => formatCompact(v)}
              labelFormatter={() => ""}
            />
            <Scatter data={points} fill="var(--report-accent)" isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// The map (react-simple-maps + bundled world topology) is heavy, so load it only
// when a Geo card is actually rendered.
const LazyGeoMap = dynamic(() => import("@/components/report-builder/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => <Empty text="Loading map…" />,
});

function GeoView({ config, data }: { config: Cfg; data: ReportData | null }) {
  const source = str(config, "source", "ga4");
  const def = getSourceDef(source as MetricSource);
  if (!def) return <Empty text="Pick a source" />;
  if (!def.dimensions.some((d) => d.type === "country")) {
    return <Empty text="This source has no country breakdown" />;
  }
  const metric = str(config, "metric", def.breakdownMetrics[0] ?? "sessions");
  return <LazyGeoMap data={data} source={source} metric={metric} />;
}

function Html({ html, placeholder }: { html: string; placeholder: string }) {
  if (!html) return <Empty text={placeholder} />;
  return <div className="rb-prose text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

// --- AI config panel --------------------------------------------------------

const AI_KIND: Partial<Record<ComponentType, "summary" | "recommendations" | "highlights" | "whatchanged">> = {
  ai_summary: "summary",
  ai_recommendations: "recommendations",
  ai_highlights: "highlights",
  ai_whatchanged: "whatchanged",
};

function AiPanel({ type, config, onChange, ctx }: { type: ComponentType; config: Cfg; onChange: (c: Cfg) => void; ctx: EditorCtx }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = AI_KIND[type];

  async function generate() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: ctx.clientId, days: ctx.days, kind }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "Generation failed");
      onChange({ ...config, html: data.text });
      // Tell the sidebar credits widget to refresh its count.
      if (typeof window !== "undefined") window.dispatchEvent(new Event("ai-credits-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Generates from the previewed client&apos;s data and freezes the text into this card. Regenerate to refresh.
      </p>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={busy || !ctx.clientId}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {busy ? "Generating…" : str(config, "html") ? "Regenerate" : "Generate"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// --- Registry ---------------------------------------------------------------

export type RegistryEntry = {
  label: string;
  group: "Content" | "Data" | "AI";
  defaultSize: { w: number; h: number };
  defaultConfig: Cfg;
  Render: (p: { config: Cfg; data: ReportData | null }) => React.ReactNode;
  ConfigPanel: (p: { config: Cfg; onChange: (c: Cfg) => void; data: ReportData | null; ctx: EditorCtx }) => React.ReactNode;
};

const HEADING_SIZE: Record<string, string> = { h1: "text-3xl", h2: "text-xl", h3: "text-base" };

function dataPanel(kind: "metric" | "dimension") {
  return function Panel({ config, onChange }: { config: Cfg; onChange: (c: Cfg) => void }) {
    const source = str(config, "source", "ga4");
    return (
      <div className="space-y-3">
        <SelectControl label="Source" value={source} options={SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v })} />
        {kind === "metric" ? (
          <SelectControl
            label="Metric"
            value={str(config, "metric", "sessions")}
            options={metricOptions(source)}
            onChange={(v) => onChange({ ...config, metric: v })}
          />
        ) : (
          <SelectControl
            label="Dimension"
            value={str(config, "dimension", "channel_group")}
            options={dimensionOptions(source)}
            onChange={(v) => onChange({ ...config, dimension: v })}
          />
        )}
        <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
      </div>
    );
  };
}

function aiEntry(label: string, type: ComponentType, placeholder: string, defaultTitle: string): RegistryEntry {
  return {
    label,
    group: "AI",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { title: defaultTitle, html: "", style: {} },
    Render: ({ config }) => (
      <div className="space-y-2">
        {str(config, "title") && <h3 className="font-display text-base font-semibold">{str(config, "title")}</h3>}
        <Html html={str(config, "html")} placeholder={placeholder} />
      </div>
    ),
    ConfigPanel: ({ config, onChange, ctx }) => (
      <div className="space-y-3">
        <TextControl label="Heading" value={str(config, "title")} onChange={(v) => onChange({ ...config, title: v })} />
        <AiPanel type={type} config={config} onChange={onChange} ctx={ctx} />
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Content — edit or add your own commentary</p>
          <RichTextEditor value={str(config, "html")} onChange={(html) => onChange({ ...config, html })} />
        </div>
        <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
      </div>
    ),
  };
}

/** Reusable metric multi-select (used by metric grid + table). */
function MetricMultiSelect({ source, selected, onChange, only }: { source: string; selected: string[]; onChange: (m: string[]) => void; only?: Set<string> }) {
  const sel = new Set(selected);
  const opts = metricOptions(source).filter((m) => !only || only.has(m.value));
  return (
    <Labeled label="Metrics">
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
        {opts.map((m) => (
          <label key={m.value} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={sel.has(m.value)}
              onChange={(e) => {
                const next = new Set(sel);
                if (e.target.checked) next.add(m.value);
                else next.delete(m.value);
                onChange([...next]);
              }}
            />
            {m.label}
          </label>
        ))}
      </div>
    </Labeled>
  );
}

const CHART_TYPE_OPTIONS = [
  { label: "Area", value: "area" },
  { label: "Line", value: "line" },
  { label: "Bar", value: "bar" },
];

function chartPanel({ config, onChange }: { config: Cfg; onChange: (c: Cfg) => void }) {
  const source = str(config, "source", "ga4");
  return (
    <div className="space-y-3">
      <SelectControl label="Source" value={source} options={SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v })} />
      <SelectControl label="Metric" value={str(config, "metric", "sessions")} options={metricOptions(source)} onChange={(v) => onChange({ ...config, metric: v })} />
      <SelectControl label="Chart type" value={str(config, "chartType", "area")} options={CHART_TYPE_OPTIONS} onChange={(v) => onChange({ ...config, chartType: v })} />
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    </div>
  );
}

function compositionPanel({ config, onChange }: { config: Cfg; onChange: (c: Cfg) => void }) {
  const source = str(config, "source", "ga4");
  const def = getSourceDef(source as MetricSource);
  const breakdownOnly = new Set(def?.breakdownMetrics ?? []);
  return (
    <div className="space-y-3">
      <SelectControl label="Source" value={source} options={SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v, metric: "" })} />
      <SelectControl label="Dimension" value={str(config, "dimension", "channel_group")} options={dimensionOptions(source)} onChange={(v) => onChange({ ...config, dimension: v })} />
      <SelectControl
        label="Metric"
        value={str(config, "metric", def?.breakdownMetrics[0] ?? "sessions")}
        options={metricOptions(source).filter((m) => breakdownOnly.has(m.value))}
        onChange={(v) => onChange({ ...config, metric: v })}
      />
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    </div>
  );
}

function tablePanel({ config, onChange }: { config: Cfg; onChange: (c: Cfg) => void }) {
  const source = str(config, "source", "ga4");
  const def = getSourceDef(source as MetricSource);
  const breakdownOnly = new Set(def?.breakdownMetrics ?? []);
  return (
    <div className="space-y-3">
      <SelectControl label="Source" value={source} options={SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v, metrics: [] })} />
      <SelectControl label="Dimension" value={str(config, "dimension", "channel_group")} options={dimensionOptions(source)} onChange={(v) => onChange({ ...config, dimension: v })} />
      <MetricMultiSelect source={source} selected={arr(config, "metrics")} onChange={(m) => onChange({ ...config, metrics: m })} only={breakdownOnly} />
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    </div>
  );
}

const GEO_SOURCE_OPTIONS = (Object.keys(SOURCES) as MetricSource[])
  .filter((s) => getSourceDef(s)?.dimensions.some((d) => d.type === "country"))
  .map((s) => ({ label: getSourceDef(s)!.label, value: s }));

function geoPanel({ config, onChange }: { config: Cfg; onChange: (c: Cfg) => void }) {
  const source = str(config, "source", GEO_SOURCE_OPTIONS[0]?.value ?? "ga4");
  const def = getSourceDef(source as MetricSource);
  const breakdownOnly = new Set(def?.breakdownMetrics ?? []);
  return (
    <div className="space-y-3">
      <SelectControl label="Source" value={source} options={GEO_SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v, metric: "" })} />
      <SelectControl
        label="Metric"
        value={str(config, "metric", def?.breakdownMetrics[0] ?? "sessions")}
        options={metricOptions(source).filter((m) => breakdownOnly.has(m.value))}
        onChange={(v) => onChange({ ...config, metric: v })}
      />
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    </div>
  );
}

function comboPanel({ config, onChange }: { config: Cfg; onChange: (c: Cfg) => void }) {
  const source = str(config, "source", "google_ads");
  return (
    <div className="space-y-3">
      <SelectControl label="Source" value={source} options={SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v, barMetric: "", lineMetric: "" })} />
      <SelectControl label="Bar metric" value={str(config, "barMetric", "clicks")} options={metricOptions(source)} onChange={(v) => onChange({ ...config, barMetric: v })} />
      <SelectControl label="Line metric" value={str(config, "lineMetric", "conversions")} options={metricOptions(source)} onChange={(v) => onChange({ ...config, lineMetric: v })} />
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    </div>
  );
}

function scatterPanel({ config, onChange }: { config: Cfg; onChange: (c: Cfg) => void }) {
  const source = str(config, "source", "google_ads");
  const def = getSourceDef(source as MetricSource);
  const opts = metricOptions(source).filter((m) => (def?.breakdownMetrics ?? []).includes(m.value));
  return (
    <div className="space-y-3">
      <SelectControl label="Source" value={source} options={SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v, xMetric: "", yMetric: "" })} />
      <SelectControl label="Group by" value={str(config, "dimension", "campaign")} options={dimensionOptions(source)} onChange={(v) => onChange({ ...config, dimension: v })} />
      <SelectControl label="X axis" value={str(config, "xMetric", def?.breakdownMetrics[0] ?? "clicks")} options={opts} onChange={(v) => onChange({ ...config, xMetric: v })} />
      <SelectControl label="Y axis" value={str(config, "yMetric", def?.breakdownMetrics[1] ?? "conversions")} options={opts} onChange={(v) => onChange({ ...config, yMetric: v })} />
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    </div>
  );
}

export const REGISTRY: Record<ComponentType, RegistryEntry> = {
  heading: {
    label: "Heading",
    group: "Content",
    defaultSize: { w: 12, h: 1 },
    defaultConfig: { text: "Section heading", level: "h2", style: {} },
    Render: ({ config }) => {
      const Tag = (str(config, "level", "h2") || "h2") as "h1" | "h2" | "h3";
      return <Tag className={`font-display font-semibold ${HEADING_SIZE[str(config, "level", "h2")] ?? "text-xl"}`}>{str(config, "text")}</Tag>;
    },
    ConfigPanel: ({ config, onChange }) => (
      <div className="space-y-3">
        <TextControl label="Text" value={str(config, "text")} onChange={(v) => onChange({ ...config, text: v })} />
        <SelectControl
          label="Level"
          value={str(config, "level", "h2")}
          options={[
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
          ]}
          onChange={(v) => onChange({ ...config, level: v })}
        />
        <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
      </div>
    ),
  },
  text: {
    label: "Text",
    group: "Content",
    defaultSize: { w: 6, h: 3 },
    defaultConfig: { html: "<p>Add your commentary here.</p>", style: {} },
    Render: ({ config }) => <Html html={str(config, "html")} placeholder="Add text in the panel" />,
    ConfigPanel: ({ config, onChange }) => (
      <div className="space-y-3">
        <RichTextEditor value={str(config, "html")} onChange={(html) => onChange({ ...config, html })} />
        <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
      </div>
    ),
  },
  image: {
    label: "Image",
    group: "Content",
    defaultSize: { w: 4, h: 3 },
    defaultConfig: { url: "", alt: "", style: {} },
    Render: ({ config }) => {
      const url = str(config, "url");
      if (!url) return <Empty text="Upload an image" />;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={str(config, "alt")} className="h-full w-full object-contain" />
      );
    },
    ConfigPanel: ({ config, onChange }) => (
      <div className="space-y-3">
        <ImageUploadField value={str(config, "url")} onChange={(url) => onChange({ ...config, url })} />
        <TextControl label="Alt text" value={str(config, "alt")} onChange={(v) => onChange({ ...config, alt: v })} />
        <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
      </div>
    ),
  },
  divider: {
    label: "Divider",
    group: "Content",
    defaultSize: { w: 12, h: 1 },
    defaultConfig: { style: {} },
    Render: ({ config }) => <hr style={{ borderColor: styleOf(config).textColor || "hsl(var(--border))" }} />,
    ConfigPanel: ({ config, onChange }) => (
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    ),
  },
  spacer: {
    label: "Spacer",
    group: "Content",
    defaultSize: { w: 12, h: 1 },
    defaultConfig: {},
    Render: () => <div />,
    ConfigPanel: () => <p className="text-xs text-muted-foreground">Resize the card to adjust the space.</p>,
  },
  client_header: {
    label: "Client header",
    group: "Content",
    defaultSize: { w: 12, h: 2 },
    defaultConfig: { style: {} },
    Render: ({ data }) => (
      <div>
        <h1 className="font-display text-2xl font-semibold">{data?.clientName ?? "Client"} — Performance Report</h1>
        <p className="text-sm text-muted-foreground">{data?.rangeLabel ?? ""}</p>
      </div>
    ),
    ConfigPanel: ({ config, onChange }) => (
      <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
    ),
  },
  kpi: {
    label: "KPI metric",
    group: "Data",
    defaultSize: { w: 3, h: 2 },
    defaultConfig: { source: "ga4", metric: "sessions", style: {} },
    Render: KpiView,
    ConfigPanel: dataPanel("metric"),
  },
  chart: {
    label: "Chart",
    group: "Data",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { source: "ga4", metric: "sessions", chartType: "area", style: {} },
    Render: ChartView,
    ConfigPanel: chartPanel,
  },
  pie: {
    label: "Pie / donut",
    group: "Data",
    defaultSize: { w: 4, h: 4 },
    defaultConfig: { source: "ga4", dimension: "channel_group", metric: "sessions", style: {} },
    Render: PieView,
    ConfigPanel: compositionPanel,
  },
  table: {
    label: "Data table",
    group: "Data",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { source: "ga4", dimension: "channel_group", metrics: ["sessions", "total_users", "engaged_sessions"], style: {} },
    Render: TableView,
    ConfigPanel: tablePanel,
  },
  combo: {
    label: "Combo (bar + line)",
    group: "Data",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { source: "google_ads", barMetric: "clicks", lineMetric: "conversions", style: {} },
    Render: ComboView,
    ConfigPanel: comboPanel,
  },
  stacked: {
    label: "Stacked area",
    group: "Data",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { source: "ga4", dimension: "channel_group", metric: "sessions", style: {} },
    Render: StackedView,
    ConfigPanel: compositionPanel,
  },
  scatter: {
    label: "Scatter",
    group: "Data",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { source: "google_ads", dimension: "campaign", xMetric: "clicks", yMetric: "conversions", style: {} },
    Render: ScatterView,
    ConfigPanel: scatterPanel,
  },
  geo: {
    label: "Geo map",
    group: "Data",
    defaultSize: { w: 6, h: 5 },
    defaultConfig: { source: "ga4", metric: "sessions", style: {} },
    Render: GeoView,
    ConfigPanel: geoPanel,
  },
  breakdown: {
    label: "Breakdown table",
    group: "Data",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { source: "ga4", dimension: "channel_group", style: {} },
    Render: BreakdownView,
    ConfigPanel: dataPanel("dimension"),
  },
  metric_grid: {
    label: "Metric grid",
    group: "Data",
    defaultSize: { w: 6, h: 3 },
    defaultConfig: { source: "ga4", metrics: ["sessions", "total_users", "engagement_rate", "key_events"], style: {} },
    Render: MetricGridView,
    ConfigPanel: ({ config, onChange }) => {
      const source = str(config, "source", "ga4");
      const selected = new Set(arr(config, "metrics"));
      return (
        <div className="space-y-3">
          <SelectControl label="Source" value={source} options={SOURCE_OPTIONS} onChange={(v) => onChange({ ...config, source: v, metrics: [] })} />
          <Labeled label="Metrics">
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {metricOptions(source).map((m) => (
                <label key={m.value} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selected.has(m.value)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(m.value);
                      else next.delete(m.value);
                      onChange({ ...config, metrics: [...next] });
                    }}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </Labeled>
          <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
        </div>
      );
    },
  },
  ai_summary: aiEntry("AI summary", "ai_summary", "Generate an executive summary", "Executive summary"),
  ai_recommendations: aiEntry("AI recommendations", "ai_recommendations", "Generate recommendations", "Recommendations"),
  ai_highlights: aiEntry("AI highlights", "ai_highlights", "Generate highlights / anomalies", "Highlights"),
  ai_whatchanged: aiEntry("What changed", "ai_whatchanged", "Generate a vs-last-period summary", "What changed"),
};

/** Renders one item's content with its per-card style box. */
export function ItemRender({ item, data }: { item: ReportItem; data: ReportData | null }) {
  const entry = REGISTRY[item.type];
  if (!entry) return null;
  return (
    <div className="h-full overflow-hidden" style={applyStyle(styleOf(item.config))}>
      {entry.Render({ config: item.config, data })}
    </div>
  );
}

export const PALETTE_GROUPS: Array<{ group: "Content" | "Data" | "AI"; types: ComponentType[] }> = [
  { group: "Content", types: ["heading", "text", "image", "client_header", "divider", "spacer"] },
  { group: "Data", types: ["kpi", "chart", "combo", "stacked", "scatter", "geo", "pie", "table", "breakdown", "metric_grid"] },
  { group: "AI", types: ["ai_summary", "ai_recommendations", "ai_highlights", "ai_whatchanged"] },
];
