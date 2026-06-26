"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileBarChart2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareReportDialog } from "@/components/report-builder/share-report-dialog";
import { ScheduledReportsPanel } from "@/components/scheduled-reports-panel";
import { DeliveryHistoryPanel } from "@/components/delivery-history-panel";
import { ReportsListPanel } from "@/components/reports-list-panel";
import type { Client, ReportTemplate } from "@/lib/catalog";
import type { ScheduledReportView } from "@/lib/scheduled-reports";
import type { ReportDeliveryView } from "@/lib/report-deliveries";
import type { WorkspaceRow } from "@/lib/supabase/types";

type ReportsHubProps = {
  templates: ReportTemplate[];
  clients: Client[];
  scheduledReports: ScheduledReportView[];
  deliveries: ReportDeliveryView[];
  workspace: WorkspaceRow | null;
  initialClientId?: string;
};

/**
 * The Reports hub is delivery-focused: choose a report design + client and send
 * it, manage scheduled deliveries, and review the send history. Report designs
 * are authored separately in the Report builder.
 */
export function ReportsHub({
  templates,
  clients,
  scheduledReports,
  deliveries,
  workspace,
  initialClientId,
}: ReportsHubProps) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const initialClient = clients.find((client) => client.id === initialClientId);
  const [clientId, setClientId] = useState(initialClient?.id ?? clients[0]?.id ?? "");

  const hasTargets = Boolean(templateId && clientId);
  const previewHref = hasTargets ? `/reports/view/${templateId}?client=${clientId}` : "#";

  return (
    <main className="flex-1 animate-fade-up space-y-6 p-4 lg:p-6">
      {/* Send a report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Send a report
          </CardTitle>
          <CardDescription>
            Pick a report design and a client, then share a live link or email it. Build and edit designs in the{" "}
            <Link href="/reports/builder" className="text-primary hover:underline">
              Report builder
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 || clients.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
              <p className="text-sm text-muted-foreground">
                {templates.length === 0
                  ? "Create a report design first."
                  : "Add a client before sending reports."}
              </p>
              <Button asChild size="sm" variant={templates.length === 0 ? "default" : "outline"}>
                <Link href={templates.length === 0 ? "/reports/builder" : "/clients"}>
                  {templates.length === 0 ? "Open Report builder" : "Add a client"}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="grid gap-1.5">
                <Label>Report design</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger aria-label="Report design">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger aria-label="Client">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="default" disabled={!hasTargets}>
                  <Link href={previewHref}>
                    Preview <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                {hasTargets && <ShareReportDialog templateId={templateId} clientId={clientId} days={30} />}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports list + scheduled + history */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reports{templates.length > 0 ? ` · ${templates.length}` : ""}</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="history">Delivery history</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsListPanel templates={templates} />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledReportsPanel
            schedules={scheduledReports}
            clients={clients}
            templates={templates}
            workspace={workspace}
          />
        </TabsContent>

        <TabsContent value="history">
          <div className="flex items-center justify-between pb-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FileBarChart2 className="h-4 w-4 text-muted-foreground" /> Sent reports
            </h3>
          </div>
          <DeliveryHistoryPanel deliveries={deliveries} clients={clients} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
