"use client";

import { Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSourceDef, type MetricSource } from "@/lib/metrics/catalog";

type MetricPickerProps = {
  source: MetricSource;
  active: string[];
  onToggle: (metric: string) => void;
  showEcommerce: boolean;
};

export function MetricPicker({ source, active, onToggle, showEcommerce }: MetricPickerProps) {
  const activeSet = new Set(active);
  const metrics = (getSourceDef(source)?.metrics ?? []).filter((m) => !m.ecommerce || showEcommerce);
  const core = metrics.filter((m) => !m.ecommerce);
  const ecommerce = metrics.filter((m) => m.ecommerce);

  const groups = [
    { label: "Metrics", items: core },
    ...(ecommerce.length ? [{ label: "Ecommerce", items: ecommerce }] : []),
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Metrics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dashboard metrics</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((metric) => {
                  const on = activeSet.has(metric.key);
                  return (
                    <button
                      key={metric.key}
                      type="button"
                      onClick={() => onToggle(metric.key)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors active:scale-[0.98]",
                        on ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="truncate">{metric.label}</span>
                      {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
