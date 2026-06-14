"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Check, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectorGuides } from "@/lib/connector-guides";
import { channels, type ChannelKey } from "@/lib/catalog";
import { getConnectorRateLimitInfo, syncAllRateLimitNotice } from "@/lib/connector-rate-limits";
import type { ConnectorCatalogItem } from "@/lib/data";

const statusToBadge = {
  connected: { variant: "success" as const, label: "Connected" },
  action_required: { variant: "warning" as const, label: "Action required" },
  disconnected: { variant: "muted" as const, label: "Not connected" },
};

const SYNCABLE_CHANNELS = new Set<ChannelKey>(["meta", "google_ads", "ga4", "search_console"]);

type ConnectorsContentProps = {
  connectorCatalog: ConnectorCatalogItem[];
  highlightChannel?: string;
  connectedChannel?: string;
  errorChannel?: string;
  errorReason?: string;
};

function errorMessage(channel: string | undefined, reason: string | undefined) {
  if (!channel) return null;
  const label = channels[channel as keyof typeof channels]?.label ?? channel;
  switch (reason) {
    case "token":
      return `${label} authorization succeeded but token exchange failed. Confirm META_APP_ID, META_APP_SECRET, and that your Meta app redirect URI exactly matches your NEXT_PUBLIC_APP_URL callback.`;
    case "save":
      return `${label} connected but Kōrero could not save the connection. Try again.`;
    case "db":
      return "Database is not configured. Check Supabase service role credentials.";
    default:
      return `${label} connection was cancelled or failed. Try Connect again.`;
  }
}

export function ConnectorsContent({
  connectorCatalog,
  highlightChannel,
  connectedChannel,
  errorChannel,
  errorReason,
}: ConnectorsContentProps) {
  const [guideChannel, setGuideChannel] = useState<string | null>(highlightChannel ?? null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const actionRequired = connectorCatalog.filter((c) => c.status === "action_required");
  const connectedCount = connectorCatalog.filter((c) => c.status === "connected").length;
  const syncAllNotice = syncAllRateLimitNotice(connectedCount);

  async function handleSyncAll() {
    if (syncAllNotice) {
      const proceed = window.confirm(
        `${syncAllNotice}\n\nMeta (dev tier) allows roughly 600 Ads Insights calls per ad account per hour. Google Ads Explorer tokens are capped at 2,880 operations per day.\n\nContinue with Sync all?`,
      );
      if (!proceed) return;
    }

    setSyncingAll(true);
    setSyncMessage(null);
    const response = await fetch("/api/connectors/sync", { method: "POST" });
    const payload = (await response.json()) as { message?: string; error?: string };
    setSyncingAll(false);

    if (!response.ok) {
      setSyncMessage(payload.error ?? "Sync failed");
      return;
    }

    setSyncMessage(payload.message ?? "Sync complete");
    window.location.reload();
  }

  async function handleChannelSync(channel: ChannelKey) {
    const rateLimit = getConnectorRateLimitInfo(channel);
    if (rateLimit.hasRateLimits) {
      const proceed = window.confirm(`${rateLimit.shortWarning}\n\n${rateLimit.syncGuidance}\n\nSync ${channels[channel].label} now?`);
      if (!proceed) return;
    }

    setSyncingChannel(channel);
    setSyncMessage(null);
    const response = await fetch(`/api/connectors/${channel}/sync`, { method: "POST" });
    const payload = (await response.json()) as { message?: string; error?: string };
    setSyncingChannel(null);

    if (!response.ok) {
      setSyncMessage(payload.error ?? "Sync failed");
      return;
    }

    setSyncMessage(payload.message ?? "Sync complete");
    window.location.reload();
  }

  return (
    <>
      {connectedChannel && (
        <Card className="border-success/30 bg-success/[0.06]">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <Check className="h-4 w-4 text-success" />
            <span>
              <strong>{channels[connectedChannel as keyof typeof channels]?.label ?? connectedChannel}</strong> is
              connected. Map ad accounts on each client&apos;s Settings tab, then sync when you need fresh data.
            </span>
          </CardContent>
        </Card>
      )}

      {errorChannel && (
        <Card className="border-destructive/30 bg-destructive/[0.06]">
          <CardContent className="p-4 text-sm text-destructive">{errorMessage(errorChannel, errorReason)}</CardContent>
        </Card>
      )}

      <Card className="border-border bg-muted/20">
        <CardContent className="flex flex-wrap items-start gap-3 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">On-demand sync only</p>
            <p>
              Kōrero does not poll platforms in the background. Sync when you need updated numbers — frequent syncs can
              hit Meta and Google API rate limits.
            </p>
          </div>
        </CardContent>
      </Card>

      {syncMessage && (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardContent className="p-4 text-sm">{syncMessage}</CardContent>
        </Card>
      )}

      {actionRequired.map((connector) => (
        <Card key={connector.key} className="border-warning/30 bg-warning/[0.04]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/20 text-warning">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{connector.label} requires attention</div>
                <div className="text-xs text-muted-foreground">{connector.description}</div>
              </div>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/api/connectors/${connector.key}/start`}>
                Reconnect <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight">Integrations</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => void handleSyncAll()}
          disabled={syncingAll || connectedCount === 0}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncingAll ? "animate-spin" : ""}`} />
          {syncingAll ? "Syncing…" : "Sync all"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {connectorCatalog.map((c) => {
          const meta = channels[c.key];
          const s = statusToBadge[c.status];
          const guide = connectorGuides[c.key];
          const rateLimit = getConnectorRateLimitInfo(c.key);
          const canSync = c.status === "connected" && SYNCABLE_CHANNELS.has(c.key);
          const isSyncing = syncingChannel === c.key;

          return (
            <Card
              key={c.key}
              className={`group transition-colors hover:border-primary/40 ${highlightChannel === c.key ? "ring-2 ring-primary/20" : ""}`}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white shadow-sm"
                    style={{ background: meta.color }}
                  >
                    {meta.short.slice(0, 2)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{c.label}</CardTitle>
                    <CardDescription className="text-xs">{c.description}</CardDescription>
                  </div>
                </div>
                <Badge variant={s.variant} className="gap-1">
                  {c.status === "connected" && <Check className="h-3 w-3" />}
                  {s.label}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 border-t pt-3 text-xs">
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.accounts}</span> account
                  {c.accounts === 1 ? "" : "s"} · last sync {c.lastSync}
                </div>
                {rateLimit.hasRateLimits && (
                  <p className="text-muted-foreground">{rateLimit.shortWarning}</p>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setGuideChannel(guideChannel === c.key ? null : c.key)}
                  >
                    <BookOpen className="h-3 w-3" /> Setup guide
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <Link href={`/api/connectors/${c.key}/start`}>{c.status === "connected" ? "Manage" : "Connect"}</Link>
                  </Button>
                  {canSync && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={isSyncing || syncingAll}
                      onClick={() => void handleChannelSync(c.key)}
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Syncing…" : "Sync"}
                    </Button>
                  )}
                  {c.status === "connected" && !SYNCABLE_CHANNELS.has(c.key) && (
                    <Badge variant="muted" className="text-2xs">
                      Sync adapter coming soon
                    </Badge>
                  )}
                </div>
                {guideChannel === c.key && (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs">
                    <p className="font-semibold">Prerequisites</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                      {guide.prerequisites.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-3 font-semibold">Steps</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-4 text-muted-foreground">
                      {guide.steps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                    <p className="mt-3 text-muted-foreground">Env vars: {guide.envVars.join(", ")}</p>
                    {rateLimit.docsUrl && (
                      <p className="mt-2">
                        <a href={rateLimit.docsUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          Platform rate limits
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
