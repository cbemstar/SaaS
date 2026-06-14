"use client";

import { Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { METRIC_CONFIG, type Ga4MetricKey } from "@/lib/ga4-aggregate";

const GROUPS: Array<{ label: string; keys: Ga4MetricKey[]; ecommerce?: boolean }> = [
  { label: "Audience", keys: ["total_users", "new_users", "active_users", "sessions", "sessions_per_user"] },
  {
    label: "Engagement",
    keys: [
      "engaged_sessions",
      "engagement_rate",
      "bounce_rate",
      "average_session_duration",
      "user_engagement_duration",
      "screen_page_views",
      "views_per_session",
      "event_count",
      "key_events",
    ],
  },
  { label: "Ecommerce", keys: ["total_revenue", "transactions", "purchase_revenue"], ecommerce: true },
];

type MetricPickerProps = {
  active: Ga4MetricKey[];
  onToggle: (metric: Ga4MetricKey) => void;
  showEcommerce: boolean;
};

export function MetricPicker({ active, onToggle, showEcommerce }: MetricPickerProps) {
  const activeSet = new Set(active);

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
          {GROUPS.filter((group) => !group.ecommerce || showEcommerce).map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.keys.map((key) => {
                  const on = activeSet.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onToggle(key)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors active:scale-[0.98]",
                        on ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="truncate">{METRIC_CONFIG[key].label}</span>
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
