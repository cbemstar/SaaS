import { notFound } from "next/navigation";
import type { Data } from "@measured/puck";
import { AppShell } from "@/components/app-shell";
import { ReportEditor } from "@/components/report-builder/report-editor";
import { getTemplate } from "@/lib/templates";
import { getReportData } from "@/lib/report-builder/report-data";
import { getClients } from "@/lib/data";
import { availableSources } from "@/lib/metrics/store";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";

export default async function ReportBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return notFound();

  const template = await getTemplate(workspaceId, id);
  if (!template) return notFound();

  const [workspace, clients] = await Promise.all([getActiveWorkspace(), getClients()]);
  const currency = workspace?.currency ?? "NZD";

  // Preview against the first client that has data, else the first client.
  let previewClient = clients[0] ?? null;
  for (const client of clients) {
    const sources = await availableSources(workspaceId, { clientId: client.id });
    if (sources.length) {
      previewClient = client;
      break;
    }
  }

  const reportData = previewClient
    ? await getReportData(workspaceId, previewClient.id, previewClient.name, currency)
    : null;

  // New templates start on-brand using the workspace accent colour.
  const initialData =
    (template.layout as Data | null) ??
    ({ content: [], root: { props: { brandColor: workspace?.accent_color ?? "" } } } as Data);

  return (
    <AppShell title={`Report builder · ${template.name}`} subtitle={previewClient ? `Previewing ${previewClient.name}` : undefined}>
      <div className="min-h-[calc(100dvh-3.5rem)]">
        <ReportEditor templateId={id} initialData={initialData} reportData={reportData} />
      </div>
    </AppShell>
  );
}
