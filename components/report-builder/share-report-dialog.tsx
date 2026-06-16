"use client";

import { useState } from "react";
import { Check, Copy, Send, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ShareReportDialogProps = {
  templateId: string;
  clientId: string;
  days: number;
};

export function ShareReportDialog({ templateId, clientId, days }: ShareReportDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function share(withEmail: boolean) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, clientId, days, email: withEmail && email ? email : undefined }),
      });
      const data = (await res.json()) as { url?: string; emailed?: boolean; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not create link");
      setUrl(data.url);
      if (withEmail) setStatus(data.emailed ? `Sent to ${email}` : "Link created (email not configured)");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 className="h-3.5 w-3.5" /> Share / Send
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share report with client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Creates a live link your client can open without logging in. It always reflects the latest synced data.
          </p>

          {url ? (
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="text-xs" />
              <Button variant="outline" size="icon" onClick={() => void copy()} aria-label="Copy link">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button className="w-full gap-1.5" disabled={busy} onClick={() => void share(false)}>
              <Share2 className="h-4 w-4" /> {busy ? "Creating…" : "Create share link"}
            </Button>
          )}

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="share-email">Email to client</Label>
            <div className="flex items-center gap-2">
              <Input
                id="share-email"
                type="email"
                placeholder="client@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
              <Button className="gap-1.5" disabled={busy || !email} onClick={() => void share(true)}>
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>

          {status && <p className="text-xs text-muted-foreground">{status}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
