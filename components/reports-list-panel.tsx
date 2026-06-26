"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ReportStatusBadge } from "@/components/report-builder/report-status-badge";
import { NewReportButton } from "@/components/report-builder/new-report-button";
import { formatRelativeTime, formatDateShort } from "@/lib/utils";
import type { ReportTemplate } from "@/lib/catalog";

export function ReportsListPanel({ templates }: { templates: ReportTemplate[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function duplicate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report duplicated");
      router.refresh();
    } catch {
      toast.error("Couldn't duplicate the report");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: "This permanently removes the report design. This cannot be undone.",
      confirmText: "Delete report",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`"${name}" deleted`);
      router.refresh();
    } catch {
      toast.error("Couldn't delete the report");
    } finally {
      setBusyId(null);
    }
  }

  if (templates.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <h3 className="font-display text-lg font-semibold">No reports yet</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Create your first report from a ready-made template — Marketing Snapshot, Paid Media, SEO and more.
        </p>
        <NewReportButton />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">All reports</h3>
        <NewReportButton />
      </div>
      <div className="divide-y rounded-lg border">
        {templates.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/reports/builder/${t.id}`} className="truncate font-medium hover:underline">
                  {t.name}
                </Link>
                <ReportStatusBadge status={t.status} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground" title={`Created ${formatDateShort(t.createdAt)}`}>
                Edited {formatRelativeTime(t.updatedAt)} · Created {formatDateShort(t.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5">
                <Link href={`/reports/builder/${t.id}`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5">
                <Link href={`/reports/view/${t.id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" /> View
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                disabled={busyId === t.id}
                onClick={() => void duplicate(t.id)}
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={busyId === t.id}
                onClick={() => void remove(t.id, t.name)}
                aria-label={`Delete ${t.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
