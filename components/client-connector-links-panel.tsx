"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { channels, type ChannelKey, type Client } from "@/lib/catalog";
import type { ConnectorCatalogItem } from "@/lib/data";
import type { ClientConnectorLinkView } from "@/lib/client-connector-links";

type DiscoveredAccount = {
  id: string;
  name: string;
};

type ClientConnectorLinksPanelProps = {
  client: Client;
  connectors: ConnectorCatalogItem[];
  links: ClientConnectorLinkView[];
  trackedChannels: ChannelKey[];
};

const manualIdHints: Partial<Record<ChannelKey, string>> = {
  google_ads: "e.g. 1234567890 (no dashes)",
  meta: "e.g. 1234567890 or act_1234567890",
  ga4: "GA4 property ID",
  search_console: "e.g. https://example.com/ or sc-domain:example.com",
  linkedin: "Ad account ID",
  tiktok: "Advertiser ID",
};

export function ClientConnectorLinksPanel({
  client,
  connectors,
  links,
  trackedChannels,
}: ClientConnectorLinksPanelProps) {
  const router = useRouter();
  const [savingChannel, setSavingChannel] = useState<ChannelKey | null>(null);

  if (trackedChannels.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Add channels above, then map each one to an ad account or property.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Data source mapping</h3>
        <p className="text-xs text-muted-foreground">
          Link each tracked channel to the correct ad account so sync and reports pull this client&apos;s data only.
        </p>
      </div>

      {trackedChannels.map((channel) => {
        const connector = connectors.find((item) => item.key === channel);
        const link = links.find((item) => item.channel === channel);
        return (
          <ChannelLinkRow
            key={channel}
            clientId={client.id}
            channel={channel}
            connector={connector}
            link={link}
            saving={savingChannel === channel}
            onSavingChange={(saving) => setSavingChannel(saving ? channel : null)}
            onSaved={() => {
              toast.success(`${channels[channel].label} mapping saved`);
              router.refresh();
            }}
            onCleared={() => {
              toast.success(`${channels[channel].label} mapping removed`);
              router.refresh();
            }}
          />
        );
      })}
    </div>
  );
}

type ChannelLinkRowProps = {
  clientId: string;
  channel: ChannelKey;
  connector: ConnectorCatalogItem | undefined;
  link: ClientConnectorLinkView | undefined;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onSaved: () => void;
  onCleared: () => void;
};

function ChannelLinkRow({
  clientId,
  channel,
  connector,
  link,
  saving,
  onSavingChange,
  onSaved,
  onCleared,
}: ChannelLinkRowProps) {
  const [accounts, setAccounts] = useState<DiscoveredAccount[]>([]);
  const [manualEntry, setManualEntry] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(link?.externalAccountId ?? "");
  const [manualAccountId, setManualAccountId] = useState(link?.externalAccountId ?? "");
  const [accountName, setAccountName] = useState(link?.externalAccountName ?? "");

  const isConnected = connector?.status === "connected" || connector?.status === "action_required";

  useEffect(() => {
    if (!isConnected) return;

    setLoadingAccounts(true);
    void fetch(`/api/connectors/${channel}/accounts`)
      .then((response) => response.json())
      .then((payload: { accounts?: DiscoveredAccount[]; manualEntry?: boolean }) => {
        const discovered = payload.accounts ?? [];
        setAccounts(discovered);
        setManualEntry(payload.manualEntry ?? discovered.length === 0);
        if (discovered.length > 0 && link?.externalAccountId) {
          setSelectedAccountId(link.externalAccountId);
        }
      })
      .finally(() => setLoadingAccounts(false));
  }, [channel, isConnected, link?.externalAccountId]);

  async function handleSave() {
    const externalAccountId = manualEntry || accounts.length === 0 ? manualAccountId.trim() : selectedAccountId;
    if (!externalAccountId) {
      toast.error("Select or enter an account ID");
      return;
    }

    const resolvedName =
      accountName.trim() ||
      accounts.find((account) => account.id === externalAccountId)?.name ||
      null;

    onSavingChange(true);

    const response = await fetch(`/api/clients/${clientId}/connector-links`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        externalAccountId,
        externalAccountName: resolvedName,
      }),
    });

    onSavingChange(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(payload.error ?? "Could not save mapping");
      return;
    }

    onSaved();
  }

  async function handleClear() {
    onSavingChange(true);

    const response = await fetch(`/api/clients/${clientId}/connector-links?channel=${channel}`, {
      method: "DELETE",
    });

    onSavingChange(false);
    if (!response.ok) {
      toast.error("Could not remove mapping");
      return;
    }

    setSelectedAccountId("");
    setManualAccountId("");
    setAccountName("");
    onCleared();
  }

  return (
    <div className="space-y-3 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{channels[channel].label}</div>
          <div className="text-xs text-muted-foreground">
            {link?.externalAccountId
              ? `Mapped · ${link.externalAccountName ?? link.externalAccountId}`
              : isConnected
                ? `Connected · last sync ${connector?.lastSync ?? "—"}`
                : "Not connected"}
          </div>
        </div>
        {!isConnected && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/connectors?channel=${channel}`}>Connect</Link>
          </Button>
        )}
      </div>

      {isConnected && (
        <div className="space-y-2">
          {loadingAccounts ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading accounts…
            </p>
          ) : accounts.length > 0 && !manualEntry ? (
            <div className="grid gap-1.5">
              <Label htmlFor={`account-${channel}`}>Ad account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger id={`account-${channel}`}>
                  <SelectValue placeholder="Select account…" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor={`manual-${channel}`}>Account ID</Label>
              <Input
                id={`manual-${channel}`}
                value={manualAccountId}
                onChange={(event) => setManualAccountId(event.target.value)}
                placeholder={manualIdHints[channel] ?? "External account ID"}
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor={`name-${channel}`}>Display name (optional)</Label>
            <Input
              id={`name-${channel}`}
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Client Meta ad account"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : link ? "Update mapping" : "Save mapping"}
            </Button>
            {link && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => void handleClear()} disabled={saving}>
                <Unlink className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
            <Button asChild size="sm" variant="ghost">
              <Link href={`/connectors?channel=${channel}`}>Connector settings</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
