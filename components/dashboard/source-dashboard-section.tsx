import { readBreakdownRaw, readDaily, hasSourceData } from "@/lib/metrics/store";
import { getDashboardLayout } from "@/lib/dashboard-preferences";
import { CustomizableDashboard } from "@/components/dashboard/customizable-dashboard";
import type { MetricSource, Scope } from "@/lib/metrics/catalog";

type SourceDashboardSectionProps = {
  workspaceId: string;
  source: MetricSource;
  scope: Scope;
  /** Persistence key, e.g. "overview" or a client id. Source is appended. */
  scopeBase: string;
  currency: string;
};

/** Server wrapper: fetches a source's metrics + saved layout and renders the dashboard. */
export async function SourceDashboardSection({
  workspaceId,
  source,
  scope,
  scopeBase,
  currency,
}: SourceDashboardSectionProps) {
  const scopeKey = `${scopeBase}:${source}`;
  const [daily, breakdowns, hasData, initialLayout] = await Promise.all([
    readDaily(workspaceId, scope, source),
    readBreakdownRaw(workspaceId, scope, source),
    hasSourceData(workspaceId, scope, source),
    getDashboardLayout(workspaceId, scopeKey),
  ]);

  return (
    <CustomizableDashboard
      source={source}
      scopeKey={scopeKey}
      currency={currency}
      hasData={hasData}
      daily={daily}
      breakdowns={breakdowns}
      initialLayout={initialLayout}
    />
  );
}
