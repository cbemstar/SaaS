"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@/components/report-builder/report-builder.css";
import { useEffect, useRef, useState, type ComponentType as ReactComponentType, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout/legacy";
import { GripVertical, Trash2, ExternalLink, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorInput, FONT_OPTIONS } from "@/components/report-builder/fields";
import { Labeled, SelectControl } from "@/components/report-builder/controls";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { themeStyle, type ReportTheme } from "@/components/report-builder/report-theme";
import {
  ItemRender,
  PALETTE_GROUPS,
  REGISTRY,
  type ComponentType,
  type EditorCtx,
  type ReportItem,
  type ReportLayoutV2,
} from "@/components/report-builder/registry";
import { PRESETS, buildAutoReportItems } from "@/components/report-builder/presets";
import type { MetricSource } from "@/lib/metrics/catalog";
import type { ReportData } from "@/lib/report-builder/types";
import type { ReportStatus } from "@/lib/catalog";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: ReportStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
];

type GridProps = {
  className?: string;
  layout: Layout;
  cols: number;
  rowHeight: number;
  margin?: [number, number];
  draggableHandle?: string;
  onLayoutChange?: (layout: Layout) => void;
  children?: ReactNode;
};
const Grid = WidthProvider(GridLayout) as unknown as ReactComponentType<GridProps>;

const COLS = 12;
const ROW_H = 64;

function newId() {
  return `i_${crypto.randomUUID().slice(0, 8)}`;
}

function ThemePanel({ theme, onChange }: { theme: ReportTheme; onChange: (t: ReportTheme) => void }) {
  const set = (patch: Partial<ReportTheme>) => onChange({ ...theme, ...patch });
  return (
    <div className="space-y-3">
      <Labeled label="Brand colour">
        <ColorInput value={theme.brandColor} onChange={(v) => set({ brandColor: v })} />
      </Labeled>
      <SelectControl
        label="Font"
        value={theme.fontFamily ?? ""}
        options={FONT_OPTIONS}
        onChange={(v) => set({ fontFamily: v })}
      />
      <Labeled label="Page background">
        <ColorInput value={theme.pageBackground} onChange={(v) => set({ pageBackground: v })} />
      </Labeled>
      <Labeled label="Base text colour">
        <ColorInput value={theme.textColor} onChange={(v) => set({ textColor: v })} />
      </Labeled>
      <SelectControl
        label="Spacing"
        value={theme.spacing ?? "comfortable"}
        options={[
          { label: "Compact", value: "compact" },
          { label: "Comfortable", value: "comfortable" },
          { label: "Spacious", value: "spacious" },
        ]}
        onChange={(v) => set({ spacing: v as ReportTheme["spacing"] })}
      />
    </div>
  );
}

export function GridEditor({
  templateId,
  initial,
  data,
  ctx,
  aiEnabled = false,
  status: initialStatus = "draft",
  createdAt,
  updatedAt,
}: {
  templateId: string;
  initial: ReportLayoutV2;
  data: ReportData | null;
  ctx: EditorCtx;
  aiEnabled?: boolean;
  status?: ReportStatus;
  createdAt?: string;
  updatedAt?: string;
}) {
  const [layout, setLayout] = useState<ReportLayoutV2>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ReportStatus>(initialStatus);
  const [savedAt, setSavedAt] = useState<string | undefined>(updatedAt);
  const [building, setBuilding] = useState(false);
  const confirm = useConfirm();
  const first = useRef(true);

  async function changeStatus(next: ReportStatus) {
    const prev = status;
    setStatus(next);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next === "ready" ? "Marked as ready" : next === "sent" ? "Marked as sent" : "Saved as draft");
    } catch {
      setStatus(prev);
      toast.error("Couldn't update status");
    }
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaving(true);
    const timer = setTimeout(() => {
      void fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      })
        .then((res) => {
          if (!res.ok) toast.error("Couldn't save changes — check your connection");
          else setSavedAt(new Date().toISOString());
        })
        .catch(() => toast.error("Couldn't save changes — check your connection"))
        .finally(() => setSaving(false));
    }, 700);
    return () => clearTimeout(timer);
  }, [layout, templateId]);

  const selected = layout.items.find((i) => i.id === selectedId) ?? null;
  // Render the selected card's config panel as a real component (not a function
  // call) so its hooks live in their own scope, and key it by card id so the
  // rich-text editor remounts with the right content when you switch cards.
  const SelectedConfigPanel = selected ? REGISTRY[selected.type].ConfigPanel : null;

  const AI_KINDS: Partial<Record<ComponentType, "summary" | "recommendations" | "highlights" | "whatchanged">> = {
    ai_summary: "summary",
    ai_recommendations: "recommendations",
    ai_highlights: "highlights",
    ai_whatchanged: "whatchanged",
  };

  async function createFullReport() {
    if (!ctx.clientId) {
      toast.error("Open a client with data to build a full report.");
      return;
    }
    const sources = (data?.availableSources ?? []) as MetricSource[];
    if (!sources.length) {
      toast.error("No connected sources with data to build from yet.");
      return;
    }
    if (layout.items.length > 0) {
      const ok = await confirm({
        title: "Build a full report?",
        description: "This lays out a complete report from your connected sources and replaces the current cards.",
        confirmText: "Build report",
        destructive: true,
      });
      if (!ok) return;
    }

    setBuilding(true);
    const items = buildAutoReportItems(sources).map((it) => ({ ...it, id: newId() }));
    setLayout((prev) => ({ ...prev, items }));
    setSelectedId(null);

    if (aiEnabled) {
      await Promise.all(
        items
          .filter((it) => AI_KINDS[it.type])
          .map(async (it) => {
            try {
              const res = await fetch("/api/reports/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId: ctx.clientId, days: ctx.days, kind: AI_KINDS[it.type] }),
              });
              const d = (await res.json().catch(() => null)) as { text?: string } | null;
              if (res.ok && d?.text) {
                setLayout((prev) => ({
                  ...prev,
                  items: prev.items.map((p) => (p.id === it.id ? { ...p, config: { ...p.config, html: d.text } } : p)),
                }));
              }
            } catch {
              /* leave the card empty for manual generation */
            }
          }),
      );
      if (typeof window !== "undefined") window.dispatchEvent(new Event("ai-credits-updated"));
    }

    setBuilding(false);
    toast.success("Full report created — review and edit any card.");
  }

  function addItem(type: ComponentType) {
    const entry = REGISTRY[type];
    const y = layout.items.reduce((max, i) => Math.max(max, i.y + i.h), 0);
    const item: ReportItem = { id: newId(), type, x: 0, y, w: entry.defaultSize.w, h: entry.defaultSize.h, config: { ...entry.defaultConfig } };
    setLayout((prev) => ({ ...prev, items: [...prev.items, item] }));
    setSelectedId(item.id);
  }

  function removeItem(id: string) {
    setLayout((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function updateConfig(id: string, config: ReportItem["config"]) {
    setLayout((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, config } : i)) }));
  }

  function onLayoutChange(next: Layout) {
    setLayout((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        const l = next.find((n) => n.i === it.id);
        return l ? { ...it, x: l.x, y: l.y, w: l.w, h: l.h } : it;
      }),
    }));
  }

  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setLayout((prev) => ({
      ...prev,
      items: preset.items
        .filter((it) => aiEnabled || !it.type.startsWith("ai_"))
        .map((it) => ({ ...it, id: newId(), config: { ...it.config } })),
    }));
    setSelectedId(null);
  }

  const rglLayout: Layout = layout.items.map((i) => ({ i: i.id, x: i.x, y: i.y, w: i.w, h: i.h, minW: 1, minH: 1 }));

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Status
            <select
              value={status}
              onChange={(e) => void changeStatus(e.target.value as ReportStatus)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) applyPreset(e.target.value);
              e.target.value = "";
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="">Apply template…</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {saving ? "Saving…" : "Saved"}
            {savedAt && ` · edited ${formatRelativeTime(savedAt)}`}
            {createdAt && ` · created ${formatRelativeTime(createdAt)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void createFullReport()}
            disabled={building}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" /> {building ? "Building…" : "Create Full Report with AI"}
          </button>
          <Link
            href={`/reports/view/${templateId}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View / Print
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Palette */}
        <aside className="w-44 shrink-0 overflow-y-auto border-r p-3">
          {PALETTE_GROUPS.filter((g) => aiEnabled || g.group !== "AI").map((g) => (
            <div key={g.group} className="mb-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</p>
              <div className="space-y-1">
                {g.types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addItem(type)}
                    className="flex w-full items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 active:scale-[0.98]"
                  >
                    <Plus className="h-3 w-3 shrink-0 text-muted-foreground" /> {REGISTRY[type].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Canvas */}
        <div className="min-w-0 flex-1 overflow-auto bg-muted/30 p-4">
          <div className="mx-auto max-w-[920px] rounded-xl bg-card p-4 shadow-panel" style={themeStyle(layout.theme)}>
            {layout.items.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Add components from the left, or apply a preset.
              </div>
            ) : (
              <Grid
                className="layout"
                layout={rglLayout}
                cols={COLS}
                rowHeight={ROW_H}
                margin={[12, 12]}
                draggableHandle=".rb-drag"
                onLayoutChange={onLayoutChange}
              >
                {layout.items.map((item) => (
                  <div key={item.id}>
                    <div
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "flex h-full flex-col overflow-hidden rounded-lg border bg-card",
                        selectedId === item.id ? "ring-2 ring-primary" : "border-border",
                      )}
                    >
                      <div className="rb-drag flex shrink-0 cursor-grab items-center justify-between gap-1 border-b bg-muted/30 px-2 py-1 active:cursor-grabbing">
                        <span className="flex items-center gap-1 truncate text-[11px] font-medium text-muted-foreground">
                          <GripVertical className="h-3 w-3" /> {REGISTRY[item.type].label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto p-3">
                        <ItemRender item={item} data={data} />
                      </div>
                    </div>
                  </div>
                ))}
              </Grid>
            )}
          </div>
        </div>

        {/* Config / theme panel */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l p-4">
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{REGISTRY[selected.type].label}</p>
                <button
                  type="button"
                  onClick={() => removeItem(selected.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
              {SelectedConfigPanel && (
                <SelectedConfigPanel
                  key={selected.id}
                  config={selected.config}
                  onChange={(c) => updateConfig(selected.id, c)}
                  data={data}
                  ctx={ctx}
                />
              )}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back to theme
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Report theme</p>
              <ThemePanel theme={layout.theme} onChange={(theme) => setLayout((prev) => ({ ...prev, theme }))} />
              <p className="pt-2 text-xs text-muted-foreground">Select a card to edit its content and style.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
