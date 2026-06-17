"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { channels, type ChannelKey, type Client } from "@/lib/catalog";
import { ClientConnectorLinksPanel } from "@/components/client-connector-links-panel";
import type { ClientConnectorLinkView } from "@/lib/client-connector-links";
import type { ConnectorCatalogItem } from "@/lib/data";

const channelOptions = Object.keys(channels) as ChannelKey[];

type ClientSettingsFormProps = {
  client: Client;
  connectors: ConnectorCatalogItem[];
  connectorLinks: ClientConnectorLinkView[];
};

export function ClientSettingsForm({ client, connectors, connectorLinks }: ClientSettingsFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [name, setName] = useState(client.name);
  const [industry, setIndustry] = useState(client.industry);
  const [status, setStatus] = useState(client.status);
  const [selectedChannels, setSelectedChannels] = useState<ChannelKey[]>(client.channels);
  const [contactEmail, setContactEmail] = useState(client.contact_email ?? "");
  const [loading, setLoading] = useState(false);

  function toggleChannel(channel: ChannelKey) {
    setSelectedChannels((current) =>
      current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel],
    );
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const response = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        industry,
        status,
        channels: selectedChannels,
        contact_email: contactEmail.trim() || null,
      }),
    });

    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(payload.error ?? "Could not save changes");
      return;
    }

    toast.success("Client details saved");
    router.refresh();
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${client.name}?`,
      description: "This removes the client and all of its synced performance data. This cannot be undone.",
      confirmText: "Delete client",
      destructive: true,
    });
    if (!ok) return;

    const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete client");
      return;
    }

    toast.success(`${client.name} deleted`);
    router.push("/clients");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void handleSave(event)} className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Client details</h3>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-industry">Industry</Label>
          <Input id="edit-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as Client["status"])}>
            <SelectTrigger id="edit-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="contact-email">Report delivery email</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="client@company.co.nz"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Default recipient when sending reports from the builder or client page.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Channels</Label>
          <div className="flex flex-wrap gap-2">
            {channelOptions.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedChannels.includes(channel)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {channels[channel].short}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => void handleDelete()}>
            Delete client
          </Button>
        </div>
      </form>

      <ClientConnectorLinksPanel
        client={client}
        connectors={connectors}
        links={connectorLinks}
        trackedChannels={selectedChannels}
      />
    </div>
  );
}
