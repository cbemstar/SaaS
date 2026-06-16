import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GridEditor } from "@/components/report-builder/grid-editor";
import { isV2, type ReportLayoutV2 } from "@/components/report-builder/registry";
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

  const layout = template.layout;
  const initial: ReportLayoutV2 = isV2(layout)
    ? layout
    : { version: 2, theme: { brandColor: workspace?.accent_color ?? "", spacing: "comfortable" }, items: [] };

  return (
    <AppShell
      title={`Report builder · ${template.name}`}
      subtitle={previewClient ? `Previewing ${previewClient.name}` : undefined}
    >
      <GridEditor
        templateId={id}
        initial={initial}
        data={reportData}
        ctx={{ clientId: previewClient?.id ?? "", days: 30 }}
      />
    </AppShell>
  );
}
