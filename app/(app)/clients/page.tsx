import { AppShell } from "@/components/app-shell";
import { ClientsList } from "@/components/clients-list";
import { getClients } from "@/lib/data";

type ClientsPageProps = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const clients = await getClients();
  const activeCount = clients.filter((c) => c.status === "active").length;

  return (
    <AppShell title="Clients" subtitle={`${clients.length} accounts · ${activeCount} active`}>
      <main className="flex-1 space-y-4 p-4 lg:p-6">
        <ClientsList clients={clients} welcome={Boolean(params.welcome)} />
      </main>
    </AppShell>
  );
}
