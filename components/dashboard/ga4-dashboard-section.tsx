import { getGa4BreakdownRaw, getGa4Daily, hasGa4Data, type Ga4Scope } from "@/lib/ga4-metrics";
import { getDashboardLayout } from "@/lib/dashboard-preferences";
import { CustomizableDashboard } from "@/components/dashboard/customizable-dashboard";

type Ga4DashboardSectionProps = {
  workspaceId: string;
  scope: Ga4Scope;
  scopeKey: string;
  currency: string;
};

/** Server wrapper: fetches GA4 data + saved layout and renders the interactive dashboard. */
export async function Ga4DashboardSection({ workspaceId, scope, scopeKey, currency }: Ga4DashboardSectionProps) {
  const [daily, breakdowns, hasData, initialLayout] = await Promise.all([
    getGa4Daily(workspaceId, scope),
    getGa4BreakdownRaw(workspaceId, scope),
    hasGa4Data(workspaceId, scope),
    getDashboardLayout(workspaceId, scopeKey),
  ]);

  return (
    <CustomizableDashboard
      scopeKey={scopeKey}
      currency={currency}
      hasData={hasData}
      daily={daily}
      breakdowns={breakdowns}
      initialLayout={initialLayout}
    />
  );
}
