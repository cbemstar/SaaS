"use client";

import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricPicker } from "@/components/dashboard/metric-picker";
import { DIMENSION_META, type Ga4Filter, type Ga4MetricKey } from "@/lib/ga4-aggregate";

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

type FilterBarProps = {
  days: number;
  onDaysChange: (days: number) => void;
  filter: Ga4Filter;
  onClearFilter: () => void;
  editing: boolean;
  onToggleEditing: () => void;
  activeMetrics: Ga4MetricKey[];
  onToggleMetric: (metric: Ga4MetricKey) => void;
  showEcommerce: boolean;
  saving: boolean;
  onReset: () => void;
};

export function FilterBar({
  days,
  onDaysChange,
  filter,
  onClearFilter,
  editing,
  onToggleEditing,
  activeMetrics,
  onToggleMetric,
  showEcommerce,
  saving,
  onReset,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(days)} onValueChange={(value) => onDaysChange(Number(value))}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filter && (
        <button
          type="button"
          onClick={onClearFilter}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          {DIMENSION_META[filter.dimensionType].label}: {filter.value || "(not set)"}
          <X className="h-3 w-3" />
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
        <MetricPicker active={activeMetrics} onToggle={onToggleMetric} showEcommerce={showEcommerce} />
        {editing && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={onToggleEditing}
        >
          {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? "Done" : "Customize"}
        </Button>
      </div>
    </div>
  );
}
