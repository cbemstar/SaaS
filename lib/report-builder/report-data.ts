import { aggregateTotals, resolveWindows, type MetricSource } from "@/lib/metrics/catalog";
import { availableSources, readBreakdownRaw, readDaily } from "@/lib/metrics/store";
import type { ReportData } from "@/lib/report-builder/types";

/**
 * Assembles everything a report's blocks need for one client over a window:
 * per-source totals, previous-period totals, daily series, and breakdowns.
 */
export async function getReportData(
  workspaceId: string,
  clientId: string,
  clientName: string,
  currency: string,
  days = 30,
): Promise<ReportData> {
  const sources = await availableSources(workspaceId, { clientId });

  const entries = await Promise.all(
    sources.map(async (source) => {
      const [daily, breakdowns] = await Promise.all([
        readDaily(workspaceId, { clientId }, source),
        readBreakdownRaw(workspaceId, { clientId }, source),
      ]);
      const { current, previous } = resolveWindows(daily, { days, compare: "previous" });
      return [
        source,
        {
          totals: aggregateTotals(source, current.map((p) => p.metrics)),
          previousTotals: aggregateTotals(source, previous.map((p) => p.metrics)),
          daily: current,
          breakdowns,
        },
      ] as const;
    }),
  );

  return {
    clientName,
    rangeLabel: `Last ${days} days`,
    currency,
    sources: Object.fromEntries(entries) as ReportData["sources"],
    availableSources: sources as MetricSource[],
  };
}
