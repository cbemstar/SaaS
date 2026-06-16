"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles } from "lucide-react";
import { applyStyle, type BlockStyle } from "@/components/report-builder/fields";
import { RichTextEditor } from "@/components/report-builder/rich-text-field";
import { ImageUploadField } from "@/components/report-builder/image-upload-field";
import { Labeled, SelectControl, StylePanel, TextControl } from "@/components/report-builder/controls";
import type { ReportData } from "@/lib/report-builder/types";
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
  const sd = data?.sources[source as MetricSource];
  const def = getMetricDef(source as MetricSource, metric);
  if (!sd || !def) return <Empty text="Pick a source & metric" />;
  const series = sd.daily.map((p) => ({ label: p.label, value: p.metrics[metric] ?? 0 }));
  const gradId = `g-${source}-${metric}`;
  return (
    <div className="flex h-full flex-col">
      <p className="mb-1 text-sm font-semibold">{def.label}</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--report-accent)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--report-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval={Math.max(0, Math.floor(series.length / 7))} />
            <YAxis tickFormatter={(v) => formatCompact(v)} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <Tooltip formatter={(v: number) => formatMetric(source as MetricSource, metric, v, data?.currency)} />
            <Area type="monotone" dataKey="value" stroke="var(--report-accent)" strokeWidth={2} fill={`url(#${gradId})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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

function aiEntry(label: string, type: ComponentType, placeholder: string): RegistryEntry {
  return {
    label,
    group: "AI",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: { html: "", style: {} },
    Render: ({ config }) => <Html html={str(config, "html")} placeholder={placeholder} />,
    ConfigPanel: ({ config, onChange, ctx }) => (
      <div className="space-y-3">
        <AiPanel type={type} config={config} onChange={onChange} ctx={ctx} />
        <StylePanel style={styleOf(config)} onChange={(s) => onChange({ ...config, style: s })} />
      </div>
    ),
  };
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
    defaultConfig: { source: "ga4", metric: "sessions", style: {} },
    Render: ChartView,
    ConfigPanel: dataPanel("metric"),
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
  ai_summary: aiEntry("AI summary", "ai_summary", "Generate an executive summary"),
  ai_recommendations: aiEntry("AI recommendations", "ai_recommendations", "Generate recommendations"),
  ai_highlights: aiEntry("AI highlights", "ai_highlights", "Generate highlights / anomalies"),
  ai_whatchanged: aiEntry("What changed", "ai_whatchanged", "Generate a vs-last-period summary"),
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
  { group: "Data", types: ["kpi", "chart", "breakdown", "metric_grid"] },
  { group: "AI", types: ["ai_summary", "ai_recommendations", "ai_highlights", "ai_whatchanged"] },
];
