import { notFound } from "next/navigation";
import type { Data } from "@measured/puck";
import { ReportCanvas } from "@/components/report-builder/report-canvas";
import { PrintButton } from "@/components/report-builder/print-button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReportData } from "@/lib/report-builder/report-data";
import type { ReportShareRow, WorkspaceRow } from "@/lib/supabase/types";

const EMPTY_LAYOUT: Data = { content: [], root: {} };

const PRINT_CSS = `
  @media print {
    .no-print { display: none !important; }
    @page { margin: 14mm; }
    body { background: #fff !important; }
  }
`;

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createSupabaseAdminClient();
  if (!admin) return notFound();

  const { data: share } = await admin.from("report_shares").select("*").eq("token", token).maybeSingle();
  if (!share) return notFound();
  const s = share as ReportShareRow;

  const [{ data: template }, { data: client }, { data: workspace }] = await Promise.all([
    admin.from("report_templates").select("name, layout").eq("id", s.template_id).maybeSingle(),
    admin.from("clients").select("name").eq("id", s.client_id).maybeSingle(),
    admin.from("workspaces").select("*").eq("id", s.workspace_id).maybeSingle(),
  ]);
  if (!template || !client) return notFound();

  const ws = workspace as WorkspaceRow | null;
  const currency = ws?.currency ?? "NZD";
  const reportData = await getReportData(s.workspace_id, s.client_id, client.name, currency, s.days, admin);
  const layout = (template.layout as Data | null) ?? EMPTY_LAYOUT;
  const accent = ws?.accent_color ?? "#1f6f5c";
  const agencyName = ws?.name ?? "Agency";

  return (
    <main className="min-h-[100dvh] bg-muted/30 py-8">
      <style>{PRINT_CSS}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[820px] justify-end px-4">
        <PrintButton />
      </div>

      <div className="report-sheet mx-auto max-w-[820px] rounded-xl border bg-card p-10 shadow-panel">
        <header className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: accent }}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: accent }}>
              {agencyName}
            </p>
            <h1 className="font-display text-2xl font-semibold">{client.name} — Performance Report</h1>
            <p className="text-sm text-muted-foreground">{reportData.rangeLabel}</p>
          </div>
          {ws?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ws.logo_url} alt="" style={{ maxHeight: 48 }} />
          )}
        </header>

        {layout.content.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">This report has no content yet.</p>
        ) : (
          <ReportCanvas data={layout} reportData={reportData} />
        )}
      </div>
    </main>
  );
}
