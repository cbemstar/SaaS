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
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BarChart3 } from "lucide-react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TrendCard } from "@/components/dashboard/trend-card";
import { BreakdownTableCard } from "@/components/dashboard/breakdown-table-card";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LAYOUT,
  FILTERABLE_KEYS,
  METRIC_CONFIG,
  aggregateTotals,
  dailyFromBreakdown,
  ga4MetricKeys,
  hasEcommerce,
  sliceWindows,
  type CardSize,
  type DashboardLayout,
  type Ga4BreakdownRaw,
  type Ga4DailyPoint,
  type Ga4DimensionType,
  type Ga4MetricKey,
} from "@/lib/ga4-aggregate";

const SPAN: Record<CardSize, string> = {
  sm: "col-span-1",
  md: "col-span-2",
  lg: "col-span-2 md:col-span-4",
};

const NEXT_SIZE: Record<CardSize, CardSize> = { sm: "md", md: "lg", lg: "sm" };

const BREAKDOWN_ORDER: Ga4DimensionType[] = ["channel_group", "device", "country", "landing_page"];

type CustomizableDashboardProps = {
  scopeKey: string;
  currency: string;
  hasData: boolean;
  daily: Ga4DailyPoint[];
  breakdowns: Ga4BreakdownRaw[];
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
  scopeKey,
  currency,
  hasData,
  daily,
  breakdowns,
  initialLayout,
}: CustomizableDashboardProps) {
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout ?? DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstRender = useRef(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Persist layout (debounced) whenever it changes, after the initial mount.
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

  const filter = layout.filter;

  const activeDaily = useMemo(
    () => (filter ? dailyFromBreakdown(breakdowns, filter) : daily),
    [filter, breakdowns, daily],
  );

  const { current, previous } = useMemo(
    () => sliceWindows(activeDaily, layout.days),
    [activeDaily, layout.days],
  );

  const currentTotals = useMemo(() => aggregateTotals(current), [current]);
  const previousTotals = useMemo(() => aggregateTotals(previous), [previous]);

  const showEcommerce = useMemo(() => hasEcommerce(aggregateTotals(daily)), [daily]);

  const trendOptions = useMemo(
    () =>
      (filter ? FILTERABLE_KEYS : ga4MetricKeys.filter((k) => !METRIC_CONFIG[k].ecommerce || showEcommerce)),
    [filter, showEcommerce],
  );

  const trendMetric = trendOptions.includes(layout.trendMetric) ? layout.trendMetric : "sessions";

  const activeMetrics = layout.cards.map((card) => card.metric);

  function updateLayout(partial: Partial<DashboardLayout>) {
    setLayout((prev) => ({ ...prev, ...partial }));
  }

  function toggleMetric(metric: Ga4MetricKey) {
    setLayout((prev) => {
      const exists = prev.cards.some((card) => card.metric === metric);
      return {
        ...prev,
        cards: exists
          ? prev.cards.filter((card) => card.metric !== metric)
          : [...prev.cards, { metric, size: "sm" }],
      };
    });
  }

  function resizeCard(metric: Ga4MetricKey) {
    setLayout((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.metric === metric ? { ...card, size: NEXT_SIZE[card.size] } : card,
      ),
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
          <h2 className="font-display text-lg font-semibold">No GA4 data yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect a GA4 property to this client and run a sync from the Connectors page to populate
            this dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
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
        onReset={() => setLayout(DEFAULT_LAYOUT)}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeMetrics} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {layout.cards.map((card) => {
              const available = !filter || FILTERABLE_KEYS.includes(card.metric);
              return (
                <SortableMetricCard
                  key={card.metric}
                  id={card.metric}
                  editing={editing}
                  span={SPAN[card.size]}
                >
                  {(handleProps) => (
                    <MetricCard
                      metric={card.metric}
                      size={card.size}
                      current={currentTotals[card.metric]}
                      previous={previousTotals[card.metric]}
                      series={current.map((point) => ({ label: point.label, value: point[card.metric] }))}
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

      <TrendCard
        metric={trendMetric}
        daily={current}
        options={trendOptions}
        currency={currency}
        onMetricChange={(metric) => updateLayout({ trendMetric: metric })}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {BREAKDOWN_ORDER.filter((type) => breakdowns.some((row) => row.dimension_type === type)).map(
          (type) => (
            <BreakdownTableCard
              key={type}
              dimensionType={type}
              rows={breakdowns}
              filter={filter}
              onFilter={(value) =>
                updateLayout({ filter: value ? { dimensionType: type, value } : null })
              }
            />
          ),
        )}
      </div>
    </div>
  );
}
