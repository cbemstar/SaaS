"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getSourceDef, type MetricSource } from "@/lib/metrics/catalog";

type SourceTabsProps = {
  sources: MetricSource[];
  /** One server-rendered dashboard section per source, in the same order. */
  children: React.ReactNode[];
};

/**
 * Segmented control to switch between data sources. All sections are rendered
 * server-side and toggled client-side (inactive hidden) for instant switching.
 */
export function SourceTabs({ sources, children }: SourceTabsProps) {
  const [active, setActive] = useState(0);
  if (sources.length === 0) return null;

  return (
    <div className="space-y-4">
      {sources.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
          {sources.map((source, index) => (
            <button
              key={source}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98]",
                index === active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {getSourceDef(source)?.short ?? source}
            </button>
          ))}
        </div>
      )}
      {children.map((child, index) => (
        <div key={sources[index] ?? index} className={index === active ? "" : "hidden"}>
          {child}
        </div>
      ))}
    </div>
  );
}
