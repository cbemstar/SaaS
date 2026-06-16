import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ReportRender } from "@/components/report-builder/report-render";
import { isV2 } from "@/lib/report-builder/layout";
import { ReportViewControls } from "@/components/report-builder/report-view-controls";
import { PrintButton } from "@/components/report-builder/print-button";
import { ShareReportDialog } from "@/components/report-builder/share-report-dialog";
import { getTemplate } from "@/lib/templates";
import { getReportData } from "@/lib/report-builder/report-data";
import { getClients } from "@/lib/data";
import { availableSources } from "@/lib/metrics/store";
import { getActiveWorkspace, getActiveWorkspaceId } from "@/lib/workspace";

const PRINT_CSS = `
  @media print {
    .no-print { display: none !important; }
    @page { margin: 14mm; }
    body { background: #fff !important; }
  }
  .report-sheet { background: #fff; color: #111; }
`;

type ViewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ client?: string; days?: string }>;
};

export default async function ReportViewPage({ params, searchParams }: ViewPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const workspaceId = await getActiveWorkspaceId();
  if (!workspaceId) return notFound();

  const template = await getTemplate(workspaceId, id);
  if (!template) return notFound();

  const [workspace, clients] = await Promise.all([getActiveWorkspace(), getClients()]);
  if (!clients.length) return notFound();

  const currency = workspace?.currency ?? "NZD";
  const days = Number(sp.days) || 30;

  let client = clients.find((c) => c.id === sp.client) ?? null;
  if (!client) {
    for (const candidate of clients) {
      const sources = await availableSources(workspaceId, { clientId: candidate.id });
      if (sources.length) {
        client = candidate;
        break;
      }
    }
  }
  client = client ?? clients[0];

  const reportData = await getReportData(workspaceId, client.id, client.name, currency, days);
  const accent = workspace?.accent_color ?? "#1f6f5c";
  const agencyName = workspace?.name ?? "Your agency";

  return (
    <main className="min-h-[100dvh] bg-muted/30 py-8">
      <style>{PRINT_CSS}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-2 px-4">
        <Link href={`/reports/builder/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to builder
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ReportViewControls templateId={id} clients={clients} clientId={client.id} days={days} />
          <ShareReportDialog templateId={id} clientId={client.id} days={days} />
          <PrintButton />
        </div>
      </div>

      <div className="report-sheet mx-auto max-w-[820px] rounded-xl border p-10 shadow-panel">
        <header className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: accent }}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: accent }}>
              {agencyName}
            </p>
            <h1 className="font-display text-2xl font-semibold">{client.name} — Performance Report</h1>
            <p className="text-sm text-muted-foreground">{reportData.rangeLabel}</p>
          </div>
          {workspace?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={workspace.logo_url} alt="" style={{ maxHeight: 48 }} />
          )}
        </header>

        {isV2(template.layout) && template.layout.items.length > 0 ? (
          <ReportRender layout={template.layout} data={reportData} />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            This template has no content yet. Open the builder to add components.
          </p>
        )}
      </div>
    </main>
  );
}
