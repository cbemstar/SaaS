"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Loader2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { blocksForTemplate, reportTitleForClient } from "@/lib/report-blocks";
import { formatCadenceLabel } from "@/lib/schedule-timing";
import type { Client, ReportTemplate } from "@/lib/catalog";
import type { ScheduledReportView } from "@/lib/scheduled-reports";
import type { WorkspaceRow } from "@/lib/supabase/types";

type ScheduledReportsPanelProps = {
  schedules: ScheduledReportView[];
  clients: Client[];
  templates: ReportTemplate[];
  workspace: WorkspaceRow | null;
};

const weekdays = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

const hours = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${hour.toString().padStart(2, "0")}:00`,
}));

export function ScheduledReportsPanel({ schedules, clients, templates, workspace }: ScheduledReportsPanelProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [sendHour, setSendHour] = useState("8");

  const timezone = workspace?.timezone ?? "Pacific/Auckland";

  async function handleCreate() {
    if (!clientId || !templateId || !recipientEmail) {
      toast.error("Client, template, and recipient email are required");
      return;
    }

    setSubmitting(true);

    const template = templates.find((item) => item.id === templateId);
    const client = clients.find((item) => item.id === clientId);

    const response = await fetch("/api/scheduled-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        templateId,
        recipientEmail,
        cadence,
        dayOfWeek: cadence === "weekly" ? Number(dayOfWeek) : undefined,
        dayOfMonth: cadence === "monthly" ? Number(dayOfMonth) : undefined,
        sendHour: Number(sendHour),
        timezone,
        blocks: blocksForTemplate(template),
        name: client ? reportTitleForClient(client.name, template) : "Scheduled report",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSubmitting(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not create schedule");
      return;
    }

    toast.success("Schedule created");
    setCreating(false);
    setRecipientEmail("");
    router.refresh();
  }

  async function toggleActive(schedule: ScheduledReportView) {
    setBusyId(schedule.id);
    const response = await fetch(`/api/scheduled-reports/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !schedule.active }),
    });
    setBusyId(null);
    if (!response.ok) {
      toast.error("Could not update schedule");
      return;
    }
    toast.success(schedule.active ? "Schedule paused" : "Schedule resumed");
    router.refresh();
  }

  async function handleDelete(schedule: ScheduledReportView) {
    const ok = await confirm({
      title: "Delete this schedule?",
      description: `Automated delivery to ${schedule.recipient_email} will stop. This cannot be undone.`,
      confirmText: "Delete schedule",
      destructive: true,
    });
    if (!ok) return;

    setBusyId(schedule.id);
    const response = await fetch(`/api/scheduled-reports/${schedule.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!response.ok) {
      toast.error("Could not delete schedule");
      return;
    }
    toast.success("Schedule deleted");
    router.refresh();
  }

  if (clients.length === 0) {
    return (
      <CardPlaceholder>
        Add a client before scheduling automated report delivery.
      </CardPlaceholder>
    );
  }

  if (templates.length === 0) {
    return (
      <CardPlaceholder>
        Create a report template in Settings before scheduling delivery.
      </CardPlaceholder>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Scheduled delivery</h3>
          <p className="text-xs text-muted-foreground">
            Reports send automatically in {timezone}. Requires Resend to be configured.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No schedules yet. Create one to email clients their report on a recurring cadence.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="grid grid-cols-12 border-b bg-muted/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3">Client</div>
            <div className="col-span-3">Template</div>
            <div className="col-span-2">Cadence</div>
            <div className="col-span-2">Next send</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 last:border-b-0"
            >
              <div className="col-span-3">
                <p className="text-sm font-medium">{schedule.clientName ?? schedule.client_id}</p>
                <p className="truncate text-xs text-muted-foreground">{schedule.recipient_email}</p>
              </div>
              <div className="col-span-3 text-sm">{schedule.templateName ?? schedule.template_id}</div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {formatCadenceLabel(schedule.cadence, schedule.day_of_week, schedule.day_of_month, schedule.send_hour)}
              </div>
              <div className="col-span-2 flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                {new Date(schedule.next_run_at).toLocaleString("en-NZ", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <Badge variant={schedule.active ? "success" : "muted"}>{schedule.active ? "Active" : "Paused"}</Badge>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busyId === schedule.id}
                  onClick={() => void toggleActive(schedule)}
                  aria-label={schedule.active ? "Pause schedule" : "Resume schedule"}
                >
                  {schedule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={busyId === schedule.id}
                  onClick={() => void handleDelete(schedule)}
                  aria-label="Delete schedule"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {schedule.last_status === "failed" && schedule.last_error && (
                <p className="col-span-12 text-xs text-destructive">Last send failed: {schedule.last_error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule report delivery</DialogTitle>
            <DialogDescription>
              Choose the client, template, and cadence. The report emails automatically at the next matching time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
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
              <div className="grid gap-1.5">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
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
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipient-email">Recipient email</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="client@company.co.nz"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Cadence</Label>
                <Select value={cadence} onValueChange={(value) => setCadence(value as "weekly" | "monthly")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{cadence === "weekly" ? "Day of week" : "Day of month"}</Label>
                {cadence === "weekly" ? (
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekdays.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, index) => {
                        const day = String(index + 1);
                        return (
                          <SelectItem key={day} value={day}>
                            Day {day}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Send time ({timezone})</Label>
                <Select value={sendHour} onValueChange={setSendHour}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" disabled={submitting} onClick={() => void handleCreate()} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardPlaceholder({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
