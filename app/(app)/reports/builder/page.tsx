import Link from "next/link";
import { FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { NewReportButton } from "@/components/report-builder/new-report-button";
import { ReportStatusBadge } from "@/components/report-builder/report-status-badge";
import { getReportTemplates } from "@/lib/data";
import { formatRelativeTime, formatDateShort } from "@/lib/utils";

export default async function ReportBuilderIndex() {
  const templates = await getReportTemplates();

  return (
    <AppShell title="Report builder" subtitle="Design custom, drag-and-drop reports">
      <main className="flex-1 space-y-4 p-4 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {templates.length} report{templates.length === 1 ? "" : "s"}
          </p>
          <NewReportButton />
        </div>

        {templates.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">No reports yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start from a ready-made template — Marketing Snapshot, Paid Media, SEO and more.
              </p>
            </div>
            <NewReportButton />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="flex h-full flex-col justify-between transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    <ReportStatusBadge status={template.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground" title={`Created ${formatDateShort(template.createdAt)}`}>
                    Edited {formatRelativeTime(template.updatedAt)} · Created {formatDateShort(template.createdAt)}
                  </p>
                </CardContent>
                <div className="flex items-center gap-3 border-t px-4 py-2 text-sm">
                  <Link href={`/reports/builder/${template.id}`} className="font-medium text-primary hover:underline">
                    Edit
                  </Link>
                  <Link href={`/reports/view/${template.id}`} className="text-muted-foreground hover:text-foreground">
                    View / Print
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
