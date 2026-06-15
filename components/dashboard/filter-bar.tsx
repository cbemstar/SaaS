"use client";

import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricPicker } from "@/components/dashboard/metric-picker";
import { getSourceDef, type CompareMode, type MetricFilter, type MetricSource } from "@/lib/metrics/catalog";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

const COMPARE_OPTIONS: Array<{ value: CompareMode; label: string }> = [
  { value: "none", label: "No comparison" },
  { value: "previous", label: "vs previous period" },
  { value: "year", label: "vs previous year" },
];

type FilterBarProps = {
  source: MetricSource;
  days: number;
  rangeStart?: string;
  rangeEnd?: string;
  compare: CompareMode;
  onDaysChange: (days: number) => void;
  onCustomRange: (start: string, end: string) => void;
  onCompareChange: (mode: CompareMode) => void;
  filter: MetricFilter;
  onClearFilter: () => void;
  editing: boolean;
  onToggleEditing: () => void;
  activeMetrics: string[];
  onToggleMetric: (metric: string) => void;
  showEcommerce: boolean;
  saving: boolean;
  onReset: () => void;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FilterBar({
  source,
  days,
  rangeStart,
  rangeEnd,
  compare,
  onDaysChange,
  onCustomRange,
  onCompareChange,
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
  const isCustom = Boolean(rangeStart && rangeEnd);
  const dimLabel = filter
    ? getSourceDef(source)?.dimensions.find((d) => d.type === filter.dimensionType)?.label ?? filter.dimensionType
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={isCustom ? "custom" : String(days)}
        onValueChange={(value) => {
          if (value === "custom") {
            const end = today();
            const start = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
            onCustomRange(start, end);
          } else {
            onDaysChange(Number(value));
          }
        }}
      >
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCustom && (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={rangeStart}
            max={rangeEnd}
            onChange={(e) => onCustomRange(e.target.value, rangeEnd ?? today())}
            className="h-8 w-[150px] text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={rangeEnd}
            min={rangeStart}
            onChange={(e) => onCustomRange(rangeStart ?? today(), e.target.value)}
            className="h-8 w-[150px] text-xs"
          />
        </div>
      )}

      <Select value={compare} onValueChange={(value) => onCompareChange(value as CompareMode)}>
        <SelectTrigger className="h-8 w-[170px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARE_OPTIONS.map((option) => (
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
          {dimLabel}: {filter.value || "(not set)"}
          <X className="h-3 w-3" />
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
        <MetricPicker source={source} active={activeMetrics} onToggle={onToggleMetric} showEcommerce={showEcommerce} />
        {editing && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
        <Button variant={editing ? "default" : "outline"} size="sm" className="gap-1.5" onClick={onToggleEditing}>
          {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editing ? "Done" : "Customize"}
        </Button>
      </div>
    </div>
  );
}
