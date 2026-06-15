import type { BreakdownRaw, DailyPoint, MetricSource, MetricTotals } from "@/lib/metrics/catalog";

export type ReportSourceData = {
  totals: MetricTotals;
  previousTotals: MetricTotals;
  daily: DailyPoint[];
  breakdowns: BreakdownRaw[];
};

export type ReportData = {
  clientName: string;
  rangeLabel: string;
  currency: string;
  sources: Partial<Record<MetricSource, ReportSourceData>>;
  availableSources: MetricSource[];
};
