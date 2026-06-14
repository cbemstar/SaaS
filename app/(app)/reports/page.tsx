import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ReportsWorkspace } from "@/components/reports-workspace";
import { Card } from "@/components/ui/card";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";
import { getClients, getDailyPerformance, getReportTemplates, getReports } from "@/lib/data";
import { listReportDeliveries } from "@/lib/report-deliveries";
import { listScheduledReports } from "@/lib/scheduled-reports";

export default async function ReportsPage() {
  const workspaceId = await getActiveWorkspaceId();
  const [reportTemplates, clients, dailyPerformance, savedReports, workspace, scheduledReports, deliveries] =
    await Promise.all([
      getReportTemplates(),
      getClients(),
      getDailyPerformance(),
      getReports(),
      getActiveWorkspace(),
      workspaceId ? listScheduledReports(workspaceId) : Promise.resolve([]),
      workspaceId ? listReportDeliveries(workspaceId) : Promise.resolve([]),
    ]);
  const client = clients[0];

  return (
    <AppShell
      title="Report builder"
      subtitle={client ? `Build reports from templates for ${client.name}` : "Add a client to start building reports"}
    >
      <main className="flex-1 p-4 lg:p-6">
        <Suspense
          fallback={<Card className="p-8 text-center text-sm text-muted-foreground">Loading report builder…</Card>}
        >
          <ReportsWorkspace
            clients={clients}
            templates={reportTemplates}
            dailyPerformance={dailyPerformance}
            savedReports={savedReports}
            scheduledReports={scheduledReports}
            deliveries={deliveries}
            workspace={workspace}
          />
        </Suspense>
      </main>
    </AppShell>
  );
}
