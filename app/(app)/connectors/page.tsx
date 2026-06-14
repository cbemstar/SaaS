import { AppShell } from "@/components/app-shell";
import { ConnectorsContent } from "@/components/connectors-content";
import { getConnectorCatalog } from "@/lib/data";

type ConnectorsPageProps = {
  searchParams: Promise<{ channel?: string; connected?: string; error?: string; reason?: string }>;
};

export default async function ConnectorsPage({ searchParams }: ConnectorsPageProps) {
  const params = await searchParams;
  const connectorCatalog = await getConnectorCatalog();

  return (
    <AppShell title="Connectors" subtitle="Data sources powering every report and AI insight">
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <ConnectorsContent
          connectorCatalog={connectorCatalog}
          highlightChannel={params.channel}
          connectedChannel={params.connected}
          errorChannel={params.error}
          errorReason={params.reason}
        />
      </main>
    </AppShell>
  );
}
