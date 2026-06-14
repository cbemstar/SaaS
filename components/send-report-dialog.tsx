"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/lib/catalog";
import { reportTitleForClient } from "@/lib/report-blocks";
import type { ReportTemplate } from "@/lib/catalog";

type SendReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  template: ReportTemplate | undefined;
  blocks: string[];
};

export function SendReportDialog({ open, onOpenChange, client, template, blocks }: SendReportDialogProps) {
  const router = useRouter();
  const [recipientEmail, setRecipientEmail] = useState(client.contact_email ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [checking, setChecking] = useState(false);

  const reportName = reportTitleForClient(client.name, template);

  useEffect(() => {
    if (!open) return;
    setRecipientEmail(client.contact_email ?? "");
    setError(null);
    setChecking(true);
    const blocksParam = encodeURIComponent(blocks.join(","));
    void fetch(`/api/reports/delivery-check?clientId=${client.id}&blocks=${blocksParam}`)
      .then((response) => response.json())
      .then((payload: { pendingReviews?: number }) => setPendingReviews(payload.pendingReviews ?? 0))
      .finally(() => setChecking(false));
  }, [open, client.id, client.contact_email, blocks]);

  async function handleSend() {
    if (!recipientEmail.trim()) {
      setError("Recipient email is required.");
      return;
    }

    setSending(true);
    setError(null);

    const response = await fetch("/api/reports/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.id,
        templateId: template?.id,
        recipientEmail: recipientEmail.trim(),
        blocks,
        reportName,
      }),
    });

    setSending(false);
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Could not send report.");
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send report to client</DialogTitle>
          <DialogDescription>
            Email a branded link to the PDF for <strong>{client.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="send-recipient">Recipient email</Label>
            <Input
              id="send-recipient"
              type="email"
              placeholder="client@company.co.nz"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Save a default in the client&apos;s Settings tab under Report delivery.
            </p>
          </div>

          {checking ? (
            <p className="text-xs text-muted-foreground">Checking approval status…</p>
          ) : pendingReviews > 0 ? (
            <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="font-medium">Approval required</p>
                <p className="text-muted-foreground">
                  {pendingReviews} open insight{pendingReviews === 1 ? "" : "s"} need approval before AI narratives can
                  go out. Review them on the Insights page.
                </p>
              </div>
            </div>
          ) : null}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => void handleSend()}
            disabled={sending || checking || pendingReviews > 0}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
