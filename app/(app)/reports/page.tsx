import { AppShell } from "@/components/app-shell";
import { ReportsHub } from "@/components/reports-hub";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";
import { getClients, getReportTemplates } from "@/lib/data";
import { listReportDeliveries } from "@/lib/report-deliveries";
import { listScheduledReports } from "@/lib/scheduled-reports";

type ReportsPageProps = {
  searchParams: Promise<{ client?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const workspaceId = await getActiveWorkspaceId();
  const [templates, clients, workspace, scheduledReports, deliveries] = await Promise.all([
    getReportTemplates(),
    getClients(),
    getActiveWorkspace(),
    workspaceId ? listScheduledReports(workspaceId) : Promise.resolve([]),
    workspaceId ? listReportDeliveries(workspaceId) : Promise.resolve([]),
  ]);

  return (
    <AppShell title="Reports" subtitle="Send reports to clients, schedule delivery, and review history">
      <ReportsHub
        templates={templates}
        clients={clients}
        scheduledReports={scheduledReports}
        deliveries={deliveries}
        workspace={workspace}
        initialClientId={params.client}
      />
    </AppShell>
  );
}
