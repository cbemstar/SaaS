"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, currency, timezone }),
    });

    setLoading(false);
    if (response.status === 401) {
      toast.error("Your session expired. Sign in and try again.");
      return;
    }
    if (!response.ok) {
      toast.error("Could not save workspace");
      return;
    }
    toast.success("Workspace saved");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => void handleSave(event)} className="space-y-3">
        <div className="grid gap-1.5">
          <Label>Agency name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Reporting currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NZD">NZD</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
            </SelectContent>
          </Select>
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
