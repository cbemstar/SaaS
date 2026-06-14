"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DataPanel() {
  const [purging, setPurging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePurge() {
    const confirmed = window.confirm(
      "Clear all synced metrics for this workspace? Client records stay intact. You can re-import by running Sync on the Connectors page.",
    );
    if (!confirmed) {
      return;
    }

    setPurging(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/workspace/purge-performance", { method: "POST" });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not clear synced data");
        return;
      }
      setMessage(payload.message ?? "Synced metrics cleared.");
      window.location.reload();
    } catch {
      setError("Could not clear synced data");
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

        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => void handlePurge()} disabled={purging}>
          <Trash2 className="h-3.5 w-3.5" />
          {purging ? "Clearing…" : "Clear all synced metrics"}
        </Button>
      </CardContent>
    </Card>
  );
}
