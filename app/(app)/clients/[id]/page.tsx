import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, LayoutDashboard, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ClientSettingsForm } from "@/components/client-settings-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChannelPill } from "@/components/channel-pill";
import { listClientConnectorLinks } from "@/lib/client-connector-links";
import { getClient, getConnectorCatalog } from "@/lib/data";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { cn } from "@/lib/utils";

// A client is a directory entry + where you connect/map platforms for it.
// All data visualisation lives on the Dashboard; report customisation in Reports.
export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await getActiveWorkspaceId();
  const [client, connectors, connectorLinks] = await Promise.all([
    getClient(id),
    getConnectorCatalog(),
    workspaceId ? listClientConnectorLinks(workspaceId, id) : Promise.resolve([]),
  ]);
  if (!client) return notFound();

  return (
    <AppShell title={client.name} subtitle={`${client.industry} · ${client.channels.length} platforms tracked`}>
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/clients" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> All clients
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard">
                <LayoutDashboard className="h-3.5 w-3.5" /> View data
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/api/reports/pdf?clientId=${client.id}`} target="_blank">
                <Download className="h-3.5 w-3.5" /> Export PDF
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/reports?client=${client.id}`}>
                <Send className="h-3.5 w-3.5" /> Send report
              </Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className={cn("h-20 bg-gradient-to-r", client.accent)} />
          <CardContent className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-card">
                <AvatarFallback className={cn("text-xl font-semibold text-foreground", `bg-gradient-to-br ${client.accent}`)}>
                  {client.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">{client.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {client.industry}
                  <span className="text-border">·</span>
                  <Badge variant="success" className="capitalize">{client.status}</Badge>
                  {client.channels.length > 0 && <span className="text-border">·</span>}
                  {client.channels.map((ch) => <ChannelPill key={ch} channel={ch} />)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ClientSettingsForm client={client} connectors={connectors} connectorLinks={connectorLinks} />
      </main>
    </AppShell>
  );
}
