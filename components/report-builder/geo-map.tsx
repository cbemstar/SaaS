"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
// Bundled world topology (no network/CDN fetch, so no CSP allowance needed).
import topology from "world-atlas/countries-110m.json";
import { formatMetric, getMetricDef, getSourceDef, rankBreakdown, type MetricSource } from "@/lib/metrics/catalog";
import type { ReportData } from "@/lib/report-builder/types";

// Our connectors report country names in varying forms; map the common ones to
// the world-atlas `properties.name` so they shade correctly.
const ALIASES: Record<string, string> = {
  "united states": "United States of America",
  usa: "United States of America",
  us: "United States of America",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  "south korea": "South Korea",
  "russia": "Russia",
  "czechia": "Czech Republic",
  "uae": "United Arab Emirates",
};

function canonical(name: string): string {
  const key = name.trim().toLowerCase();
  return ALIASES[key] ?? name.trim();
}

export function GeoMap({
  data,
  source,
  metric,
}: {
  data: ReportData | null;
  source: string;
  metric: string;
}) {
  const sd = data?.sources[source as MetricSource];
  const def = getSourceDef(source as MetricSource);
  const [hover, setHover] = useState<{ name: string; value: number } | null>(null);

  const { byName, max, top } = useMemo(() => {
    const map = new Map<string, number>();
    if (sd) {
      for (const e of rankBreakdown(source as MetricSource, sd.breakdowns, "country", 300)) {
        map.set(canonical(e.value).toLowerCase(), e.metrics[metric] ?? 0);
      }
    }
    let m = 0;
    let topEntry: { name: string; value: number } | null = null;
    for (const [name, value] of map) {
      if (value > m) m = value;
      if (!topEntry || value > topEntry.value) topEntry = { name, value };
    }
    return { byName: map, max: Math.max(1, m), top: topEntry };
  }, [sd, source, metric]);

  if (!sd || !def) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Pick a source</div>;

  const metricLabel = getMetricDef(source as MetricSource, metric)?.label ?? metric;
  const caption = hover
    ? `${hover.name}: ${formatMetric(source as MetricSource, metric, hover.value, data?.currency)}`
    : top
      ? `Top: ${cap(top.name)} · ${formatMetric(source as MetricSource, metric, top.value, data?.currency)}`
      : "No country data";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{metricLabel} by country</p>
        <p className="truncate text-xs text-muted-foreground">{caption}</p>
      </div>
      <div className="min-h-0 flex-1">
        <ComposableMap projection="geoEqualEarth" style={{ width: "100%", height: "100%" }}>
          <Geographies geography={topology as unknown as string}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = String(geo.properties?.name ?? "");
                const value = byName.get(canonical(name).toLowerCase()) ?? 0;
                const t = value / max;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setHover({ name, value })}
                    onMouseLeave={() => setHover(null)}
                    fill={value > 0 ? "var(--report-accent)" : "hsl(var(--muted))"}
                    fillOpacity={value > 0 ? 0.2 + 0.8 * t : 0.5}
                    stroke="hsl(var(--background))"
                    strokeWidth={0.3}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fillOpacity: 0.9 },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
