"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceRow } from "@/lib/supabase/types";

type WorkspaceSettingsFormProps = {
  workspace: WorkspaceRow;
  clientCount: number;
  clientLimit: number;
};

export function WorkspaceSettingsForm({ workspace, clientCount, clientLimit }: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [currency, setCurrency] = useState(workspace.currency);
  const [timezone, setTimezone] = useState(workspace.timezone);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, currency, timezone }),
    });

    setLoading(false);
    if (response.status === 401) {
      setMessage("Sign in to save changes.");
      return;
    }
    setMessage(response.ok ? "Workspace saved." : "Could not save workspace.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <form onSubmit={(event) => void handleSave(event)} className="space-y-3">
        <div className="grid gap-1.5">
          <Label>Agency name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Reporting currency</Label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="NZD">NZD</option>
            <option value="AUD">AUD</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Timezone</Label>
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </form>
      <div className="rounded-md border p-3 text-sm">
        <p className="font-semibold">Usage</p>
        <p className="mt-1 text-muted-foreground">
          {clientCount} of {clientLimit} clients on your current plan.
        </p>
      </div>
    </div>
  );
}
