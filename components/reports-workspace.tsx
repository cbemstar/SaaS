"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Download,
  FileBarChart2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Send,
  Sparkles,
} from "lucide-react";
import { ReportBuilderCanvas } from "@/components/report-builder-canvas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  allReportBlocks,
  blocksForTemplate,
  reportBlockMeta,
  reportTitleForClient,
} from "@/lib/report-blocks";
import type { Client, DailyPerformancePoint, ReportTemplate } from "@/lib/catalog";
import { DeliveryHistoryPanel } from "@/components/delivery-history-panel";
import { SendReportDialog } from "@/components/send-report-dialog";
import { ScheduledReportsPanel } from "@/components/scheduled-reports-panel";
import type { ReportDeliveryView } from "@/lib/report-deliveries";
import type { ScheduledReportView } from "@/lib/scheduled-reports";
import type { ReportRow, WorkspaceRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ReportsWorkspaceProps = {
  clients: Client[];
  templates: ReportTemplate[];
  dailyPerformance: DailyPerformancePoint[];
  savedReports: ReportRow[];
  scheduledReports: ScheduledReportView[];
  deliveries: ReportDeliveryView[];
  workspace: WorkspaceRow | null;
};

export function ReportsWorkspace({
  clients,
  templates,
  dailyPerformance,
  savedReports,
  scheduledReports,
  deliveries,
  workspace,
}: ReportsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceName = workspace?.name ?? "Your agency";

  const tabParam = searchParams.get("tab") ?? "builder";
  const templateParam = searchParams.get("template");
  const clientParam = searchParams.get("client");

  const resolvedTemplates = templates.length > 0 ? templates : [];
  const initialTemplateId = templateParam ?? resolvedTemplates[0]?.id ?? "agency-monthly";
  const initialClientId = clientParam ?? clients[0]?.id ?? "";

  const [activeTab, setActiveTab] = useState(tabParam);
  const [clientId, setClientId] = useState(initialClientId);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [blocks, setBlocks] = useState<string[]>(() => {
    const template = resolvedTemplates.find((item) => item.id === initialTemplateId);
    return blocksForTemplate(template);
  });
  const [saving, setSaving] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const client = clients.find((item) => item.id === clientId) ?? clients[0];
  const template = resolvedTemplates.find((item) => item.id === templateId) ?? resolvedTemplates[0];

  const headerStyle = useMemo(() => {
    if (workspace?.accent_color) {
      return { backgroundColor: workspace.accent_color };
    }
    return undefined;
  }, [workspace?.accent_color]);

  const syncUrl = useCallback(
    (next: { tab?: string; template?: string; client?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.tab) params.set("tab", next.tab);
      if (next.template) params.set("template", next.template);
      if (next.client) params.set("client", next.client);
      router.replace(`/reports?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const nextTemplate = resolvedTemplates.find((item) => item.id === nextTemplateId);
    setBlocks(blocksForTemplate(nextTemplate));
    syncUrl({ tab: "builder", template: nextTemplateId, client: client?.id });
  }

  function handleClientChange(nextClientId: string) {
    setClientId(nextClientId);
    syncUrl({ tab: "builder", template: templateId, client: nextClientId });
  }

  function applyTemplate(nextTemplateId: string) {
    handleTemplateChange(nextTemplateId);
    setActiveTab("builder");
    setMessage(`Loaded template “${resolvedTemplates.find((item) => item.id === nextTemplateId)?.name ?? nextTemplateId}”.`);
  }

  function toggleBlock(blockId: string) {
    setBlocks((current) => {
      if (current.includes(blockId)) {
        const next = current.filter((id) => id !== blockId);
        return next.length > 0 ? next : current;
      }
      return [...current, blockId];
    });
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.indexOf(blockId);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  async function handleSave() {
    if (!client || !template) return;
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.id,
        templateId: template.id,
        name: reportTitleForClient(client.name, template),
        blocks,
        status: "draft",
      }),
    });
    setSaving(false);
    if (response.status === 401) {
      setMessage("Sign in to save reports.");
      return;
    }
    setMessage(response.ok ? "Report saved with this template layout." : "Could not save report.");
    if (response.ok) router.refresh();
  }

  const pdfHref = client
    ? `/api/reports/pdf?clientId=${client.id}&blocks=${encodeURIComponent(blocks.join(","))}`
    : "#";

  if (!client) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No clients yet. Create your first client from the Clients page, then return here to build reports.
      </Card>
    );
  }

  const blockCatalog = allReportBlocks();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value);
        syncUrl({ tab: value, template: templateId, client: client.id });
      }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <div className="w-full max-w-xl space-y-2 sm:w-auto">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={client.id}
              onChange={(event) => handleClientChange(event.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              {clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={template?.id ?? ""}
              onChange={(event) => handleTemplateChange(event.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              disabled={resolvedTemplates.length === 0}
            >
              {resolvedTemplates.length === 0 ? (
                <option value="">No templates — create one in Settings</option>
              ) : (
                resolvedTemplates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void handleSave()} disabled={saving || !template}>
              {saving ? "Saving…" : "Save report"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={pdfHref} target="_blank">
                <Download className="h-3.5 w-3.5" /> PDF
              </Link>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setSendDialogOpen(true)}>
              <Send className="h-3.5 w-3.5" /> Send to client
            </Button>
          </div>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </div>

      <TabsContent value="builder">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Report blocks</CardTitle>
              <CardDescription>
                {template ? (
                  <>
                    From template <span className="font-medium text-foreground">{template.name}</span>
                  </>
                ) : (
                  "Toggle blocks on the canvas"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {blockCatalog.map((block) => {
                const active = blocks.includes(block.id);
                const orderIndex = blocks.indexOf(block.id);
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-sm transition-colors",
                      active ? "border-primary/40 bg-primary/5" : "bg-card hover:bg-accent/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => toggleBlock(block.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="font-medium">{block.label}</span>
                        {active && (
                          <Badge variant="muted" className="ml-auto font-mono text-2xs">
                            {orderIndex + 1}
                          </Badge>
                        )}
                      </button>
                      {active && (
                        <div className="flex shrink-0 gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveBlock(block.id, -1)}
                            aria-label="Move up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveBlock(block.id, 1)}
                            aria-label="Move down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-3 text-xs">
                <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Template-driven layout
                </div>
                <p className="text-muted-foreground">
                  Pick a template to load its sections, then add or remove blocks before saving. Saved reports store
                  this exact block order.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileBarChart2 className="h-3.5 w-3.5" />
                <span>
                  Preview · {blocks.length} block{blocks.length === 1 ? "" : "s"}
                  {template ? ` · ${template.name}` : ""}
                </span>
              </div>
              <Link href="/settings?tab=templates" className="text-primary hover:underline">
                Edit templates
              </Link>
            </div>
            <CardContent className="bg-gradient-to-b from-muted/40 to-muted/10 p-6">
              <ReportBuilderCanvas
                client={client}
                blocks={blocks}
                dailyPerformance={dailyPerformance}
                workspaceName={workspaceName}
                headerStyle={headerStyle}
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="templates" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resolvedTemplates.length === 0 ? (
          <Card className="col-span-full p-8 text-center">
            <p className="text-sm text-muted-foreground">No templates yet.</p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/settings?tab=templates">Create templates in Settings</Link>
            </Button>
          </Card>
        ) : (
          resolvedTemplates.map((item) => (
            <Card key={item.id} className="group transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">{item.name}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {(item.sections ?? []).slice(0, 4).map((section) => (
                    <Badge key={section} variant="muted" className="text-2xs">
                      {reportBlockMeta(section).label}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {item.pages} pages · used {item.used}×
                  </span>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => applyTemplate(item.id)}>
                    Use in builder <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="scheduled">
        <ScheduledReportsPanel
          schedules={scheduledReports}
          clients={clients}
          templates={resolvedTemplates}
          workspace={workspace}
        />
      </TabsContent>

      <SendReportDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        client={client}
        template={template}
        blocks={blocks}
      />

      <TabsContent value="history" className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Delivery log</h3>
          <DeliveryHistoryPanel deliveries={deliveries} clients={clients} />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Saved drafts</h3>
        {savedReports.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No saved drafts yet. Choose a template in the builder and click Save report.
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            {savedReports.map((report) => {
              const blocksParam = Array.isArray(report.blocks)
                ? (report.blocks as string[]).join(",")
                : "kpi,ai,perf";
              return (
                <div
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.status} · {report.template_id} · {(report.blocks as string[])?.length ?? 0} blocks
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const savedBlocks = Array.isArray(report.blocks)
                          ? (report.blocks as string[])
                          : blocksForTemplate(resolvedTemplates.find((item) => item.id === report.template_id));
                        setClientId(report.client_id);
                        setTemplateId(report.template_id);
                        setBlocks(savedBlocks);
                        setActiveTab("builder");
                        syncUrl({ tab: "builder", template: report.template_id, client: report.client_id });
                        setMessage("Loaded saved report layout.");
                      }}
                    >
                      Open in builder
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/api/reports/pdf?clientId=${report.client_id}&blocks=${encodeURIComponent(blocksParam)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
