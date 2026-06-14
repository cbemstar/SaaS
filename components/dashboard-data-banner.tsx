"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Link2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMeta } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

type DashboardDataBannerProps = {
  meta: DashboardMeta;
  currency: string;
};

export function DashboardDataBanner({ meta, currency }: DashboardDataBannerProps) {
  if (meta.status === "live") {
    return (
      <Card className="border-success/30 bg-success/[0.05]">
        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Live data
              </Badge>
              {meta.lastSyncLabel && (
                <span className="text-xs text-muted-foreground">Last synced {meta.lastSyncLabel}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {meta.performanceDayCount} days · {meta.syncedClientCount} of {meta.totalClientCount} client
              {meta.totalClientCount === 1 ? "" : "s"} with synced metrics
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meta.liveChannelSpend.map((channel) => (
                <Badge key={channel.channel} variant="muted" className="text-2xs">
                  {channel.label}: {formatCurrency(channel.spend, currency)}
                </Badge>
              ))}
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/connectors">
              <RefreshCw className="h-3.5 w-3.5" />
              Sync again
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const content = bannerContent(meta);

  return (
    <Card className={content.tone}>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {content.icon}
            <span className="text-sm font-semibold">{content.title}</span>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{content.description}</p>
          {meta.connectedConnectors.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Connected: {meta.connectedConnectors.map((connector) => connector.label).join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {content.actions.map((action) => (
            <Button key={action.href} asChild size="sm" variant={action.variant ?? "default"}>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function bannerContent(meta: DashboardMeta) {
  switch (meta.status) {
    case "no_connectors":
      return {
        tone: "border-border bg-muted/20",
        icon: <Unplug className="h-4 w-4 text-muted-foreground" />,
        title: "No live data yet",
        description:
          "Connect Meta, Google Ads, or other sources so Kōrero can pull real spend and conversion metrics into this dashboard.",
        actions: [
          { href: "/connectors", label: "Connect sources" },
          { href: "/clients", label: "View clients", variant: "outline" as const },
        ],
      };
    case "awaiting_mapping":
      return {
        tone: "border-warning/30 bg-warning/[0.05]",
        icon: <Link2 className="h-4 w-4 text-warning" />,
        title: "Map client ad accounts",
        description: `${meta.unmappedClientCount} client${meta.unmappedClientCount === 1 ? "" : "s"} still need ad accounts linked before sync can pull their data.`,
        actions: [
          { href: "/clients", label: "Open client settings" },
          { href: "/connectors", label: "Run sync", variant: "outline" as const },
        ],
      };
    case "awaiting_sync":
      return {
        tone: "border-warning/30 bg-warning/[0.05]",
        icon: <RefreshCw className="h-4 w-4 text-warning" />,
        title: "Connected — waiting for first sync",
        description:
          "Your connectors are authorized, but no metrics are in Kōrero yet. Run Sync all to import the last 30 days.",
        actions: [
          { href: "/connectors", label: "Sync now" },
          { href: "/clients", label: "Check mappings", variant: "outline" as const },
        ],
      };
    default:
      return {
        tone: "border-border bg-muted/20",
        icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
        title: "Dashboard preview",
        description: "Add clients and connect data sources to replace this empty view with live metrics.",
        actions: [{ href: "/clients", label: "Add a client" }],
      };
  }
}
