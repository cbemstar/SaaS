"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BarChart3 } from "lucide-react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TrendCard } from "@/components/dashboard/trend-card";
import { BreakdownTableCard } from "@/components/dashboard/breakdown-table-card";
import { cn } from "@/lib/utils";
import {
  aggregateTotals,
  dailyFromBreakdown,
  defaultLayout,
  getSourceDef,
  hasEcommerce,
  sliceWindows,
  type BreakdownRaw,
  type CardSize,
  type DailyPoint,
  type DashboardLayout,
  type MetricSource,
} from "@/lib/metrics/catalog";

const SPAN: Record<CardSize, string> = {
  sm: "col-span-1",
  md: "col-span-2",
  lg: "col-span-2 md:col-span-4",
};

const NEXT_SIZE: Record<CardSize, CardSize> = { sm: "md", md: "lg", lg: "sm" };

type CustomizableDashboardProps = {
  source: MetricSource;
  scopeKey: string;
  currency: string;
  hasData: boolean;
  daily: DailyPoint[];
  breakdowns: BreakdownRaw[];
  initialLayout: DashboardLayout | null;
};

function SortableMetricCard({
  id,
  editing,
  span,
  children,
}: {
  id: string;
  editing: boolean;
  span: string;
  children: (handleProps: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(span, isDragging && "z-20 opacity-80")}
    >
      {children({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>)}
    </div>
  );
}

export function CustomizableDashboard({
  source,
  scopeKey,
  currency,
  hasData,
  daily,
  breakdowns,
  initialLayout,
}: CustomizableDashboardProps) {
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout ?? defaultLayout(source));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstRender = useRef(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaving(true);
    const timer = setTimeout(() => {
      void fetch("/api/dashboard/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: scopeKey, layout }),
      })
        .catch(() => {})
        .finally(() => setSaving(false));
    }, 700);
    return () => clearTimeout(timer);
  }, [layout, scopeKey]);

  const def = getSourceDef(source);
  const breakdownMetrics = useMemo(() => new Set(def?.breakdownMetrics ?? []), [def]);
  const filter = layout.filter;

  const activeDaily = useMemo(
    () => (filter ? dailyFromBreakdown(source, breakdowns, filter) : daily),
    [filter, breakdowns, daily, source],
  );

  const { current, previous } = useMemo(() => sliceWindows(activeDaily, layout.days), [activeDaily, layout.days]);

  const currentTotals = useMemo(() => aggregateTotals(source, current.map((p) => p.metrics)), [source, current]);
  const previousTotals = useMemo(() => aggregateTotals(source, previous.map((p) => p.metrics)), [source, previous]);

  const showEcommerce = useMemo(
    () => hasEcommerce(source, aggregateTotals(source, daily.map((p) => p.metrics))),
    [source, daily],
  );

  const trendOptions = useMemo(() => {
    const all = (def?.metrics ?? [])
      .filter((m) => (!m.ecommerce || showEcommerce) && !m.hidden)
      .map((m) => m.key);
    return filter ? all.filter((k) => breakdownMetrics.has(k)) : all;
  }, [def, filter, showEcommerce, breakdownMetrics]);

  const trendMetric = trendOptions.includes(layout.trendMetric) ? layout.trendMetric : trendOptions[0] ?? "";
  const trendSeries = current.map((p) => ({ label: p.label, value: p.metrics[trendMetric] ?? 0 }));

  const activeMetrics = layout.cards.map((card) => card.metric);

  function updateLayout(partial: Partial<DashboardLayout>) {
    setLayout((prev) => ({ ...prev, ...partial }));
  }

  function toggleMetric(metric: string) {
    setLayout((prev) => {
      const exists = prev.cards.some((card) => card.metric === metric);
      return {
        ...prev,
        cards: exists
          ? prev.cards.filter((card) => card.metric !== metric)
          : [...prev.cards, { metric, size: "sm" as CardSize }],
      };
    });
  }

  function resizeCard(metric: string) {
    setLayout((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => (card.metric === metric ? { ...card, size: NEXT_SIZE[card.size] } : card)),
    }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLayout((prev) => {
      const oldIndex = prev.cards.findIndex((card) => card.metric === active.id);
      const newIndex = prev.cards.findIndex((card) => card.metric === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, cards: arrayMove(prev.cards, oldIndex, newIndex) };
    });
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">No {def?.label ?? source} data yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect this source to the client and run a sync from the Connectors page to populate this view.
          </p>
        </div>
      </div>
    );
  }

  const dimensionsWithData = (def?.dimensions ?? []).filter((d) =>
    breakdowns.some((row) => row.dimension_type === d.type),
  );

  return (
    <div className="space-y-4">
      <FilterBar
        source={source}
        days={layout.days}
        onDaysChange={(days) => updateLayout({ days })}
        filter={filter}
        onClearFilter={() => updateLayout({ filter: null })}
        editing={editing}
        onToggleEditing={() => setEditing((value) => !value)}
        activeMetrics={activeMetrics}
        onToggleMetric={toggleMetric}
        showEcommerce={showEcommerce}
        saving={saving}
        onReset={() => setLayout(defaultLayout(source))}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeMetrics} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {layout.cards.map((card) => {
              const available = !filter || breakdownMetrics.has(card.metric);
              return (
                <SortableMetricCard key={card.metric} id={card.metric} editing={editing} span={SPAN[card.size]}>
                  {(handleProps) => (
                    <MetricCard
                      source={source}
                      metric={card.metric}
                      size={card.size}
                      current={currentTotals[card.metric] ?? 0}
                      previous={previousTotals[card.metric] ?? 0}
                      series={current.map((p) => ({ label: p.label, value: p.metrics[card.metric] ?? 0 }))}
                      currency={currency}
                      available={available}
                      editing={editing}
                      onResize={() => resizeCard(card.metric)}
                      onRemove={() => toggleMetric(card.metric)}
                      dragHandleProps={handleProps}
                    />
                  )}
                </SortableMetricCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {trendMetric && (
        <TrendCard
          source={source}
          metric={trendMetric}
          series={trendSeries}
          options={trendOptions}
          currency={currency}
          onMetricChange={(metric) => updateLayout({ trendMetric: metric })}
        />
      )}

      {dimensionsWithData.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {dimensionsWithData.map((dim) => (
            <BreakdownTableCard
              key={dim.type}
              source={source}
              dimensionType={dim.type}
              rows={breakdowns}
              filter={filter}
              onFilter={(value) => updateLayout({ filter: value ? { dimensionType: dim.type, value } : null })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
