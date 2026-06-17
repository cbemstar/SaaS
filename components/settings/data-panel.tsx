"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DataPanel() {
  const router = useRouter();
  const confirm = useConfirm();
  const [purging, setPurging] = useState(false);

  async function handlePurge() {
    const confirmed = await confirm({
      title: "Clear all synced metrics?",
      description:
        "This removes every synced metric for this workspace. Client records stay intact, and you can re-import by running Sync on the Connectors page.",
      confirmText: "Clear synced data",
      destructive: true,
    });
    if (!confirmed) return;

    setPurging(true);
    const toastId = toast.loading("Clearing synced metrics…");
    try {
      const response = await fetch("/api/workspace/purge-performance", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "Could not clear synced data", { id: toastId });
        return;
      }
      toast.success(payload.message ?? "Synced metrics cleared", { id: toastId });
      router.refresh();
    } catch {
      toast.error("Could not clear synced data", { id: toastId });
    } finally {
      setPurging(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Synced data</CardTitle>
        <CardDescription>
          Kōrero does not auto-sync in the background. Metrics are imported only when you run Sync on the Connectors
          page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        <div className="rounded-md border border-warning/30 bg-warning/[0.05] p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-muted-foreground">
              If your dashboard shows spend from sources you never connected, clear synced data below. Stale demo rows
              are also stripped automatically on the next sync for disconnected channels.
            </p>
          </div>
        </div>

        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => void handlePurge()} disabled={purging}>
          <Trash2 className="h-3.5 w-3.5" />
          {purging ? "Clearing…" : "Clear all synced metrics"}
        </Button>
      </CardContent>
    </Card>
  );
}
