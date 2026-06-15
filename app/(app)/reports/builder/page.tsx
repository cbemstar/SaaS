import Link from "next/link";
import { FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { NewTemplateButton } from "@/components/report-builder/new-template-button";
import { getReportTemplates } from "@/lib/data";

export default async function ReportBuilderIndex() {
  const templates = await getReportTemplates();

  return (
    <AppShell title="Report builder" subtitle="Design custom, drag-and-drop report templates">
      <main className="flex-1 space-y-4 p-4 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length === 1 ? "" : "s"}
          </p>
          <NewTemplateButton />
        </div>

        {templates.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">No templates yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Create a template to start building reports.</p>
            </div>
            <NewTemplateButton />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Link key={template.id} href={`/reports/builder/${template.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
