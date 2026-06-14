import type { ChannelKey, Client } from "@/lib/catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClientCount } from "@/lib/workspace";
import { getClientLimitForWorkspace } from "@/lib/billing";

const accents = [
  "from-amber-500/30 to-rose-500/30",
  "from-blue-500/30 to-teal-500/30",
  "from-cyan-500/30 to-emerald-500/30",
  "from-violet-500/30 to-fuchsia-500/30",
  "from-orange-500/30 to-yellow-500/30",
  "from-slate-500/30 to-zinc-500/30",
];

export function slugifyClientId(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || `client-${crypto.randomUUID().slice(0, 8)}`;
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function accentForId(id: string) {
  const hash = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return accents[hash % accents.length];
}

export async function assertCanCreateClient(workspaceId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: true as const };
  }

  const [count, limit] = await Promise.all([
    getClientCount(workspaceId),
    getClientLimitForWorkspace(workspaceId),
  ]);

  if (count >= limit) {
    return {
      ok: false as const,
      error: `Your plan allows up to ${limit} active clients. Upgrade in Settings to add more.`,
    };
  }

  return { ok: true as const };
}

export async function createClientRecord(
  workspaceId: string,
  input: {
    name: string;
    industry: string;
    channels: ChannelKey[];
    status?: Client["status"];
    contact_email?: string | null;
  },
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase not configured");
  }

  const limitCheck = await assertCanCreateClient(workspaceId);
  if (!limitCheck.ok) {
    throw new Error(limitCheck.error);
  }

  const id = slugifyClientId(input.name);
  const clientRow = {
    id,
    workspace_id: workspaceId,
    name: input.name,
    industry: input.industry,
    status: input.status ?? "active",
    monthlySpend: 0,
    spendDelta: 0,
    conversions: 0,
    conversionsDelta: 0,
    roas: 0,
    lastReport: "—",
    channels: input.channels,
    alerts: 0,
    initials: initialsFromName(input.name),
    accent: accentForId(id),
    contact_email: input.contact_email?.trim().toLowerCase() ?? null,
  };

  const { error } = await admin.from("clients").insert(clientRow);
  if (error) {
    throw error;
  }

  return clientRow;
}

export async function updateClientRecord(
  workspaceId: string,
  clientId: string,
  input: Partial<Pick<Client, "name" | "industry" | "status" | "channels" | "contact_email">>,
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase not configured");
  }

  const updates: Partial<Client> = { ...input };
  if (input.name) {
    updates.initials = initialsFromName(input.name);
  }

  const { data, error } = await admin
    .from("clients")
    .update(updates)
    .eq("workspace_id", workspaceId)
    .eq("id", clientId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteClientRecord(workspaceId: string, clientId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase not configured");
  }

  const { error } = await admin.from("clients").delete().eq("workspace_id", workspaceId).eq("id", clientId);
  if (error) {
    throw error;
  }
}

export async function refreshClientMetricsFromPerformance(workspaceId: string, clientId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const { data } = await admin
    .from("daily_performance")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("date", { ascending: true });

  if (!data?.length) {
    await admin
      .from("clients")
      .update({
        monthlySpend: 0,
        conversions: 0,
        spendDelta: 0,
        roas: 0,
      })
      .eq("workspace_id", workspaceId)
      .eq("id", clientId);
    return;
  }

  const { getAuthorizedConnectorChannels } = await import("@/lib/connector-channels");
  const authorized = await getAuthorizedConnectorChannels(workspaceId);

  const includeChannel = (channel: ChannelKey, value: number) =>
    authorized.length === 0 || authorized.includes(channel) ? value : 0;

  const spend = data.reduce(
    (sum, row) =>
      sum +
      includeChannel("meta", row.meta) +
      includeChannel("google_ads", row.google_ads) +
      includeChannel("tiktok", row.tiktok) +
      includeChannel("linkedin", row.linkedin) +
      includeChannel("ga4", row.ga4) +
      includeChannel("search_console", row.search_console),
    0,
  );
  const conversions = data.reduce((sum, row) => sum + row.conversions, 0);
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);
  const firstSpend = firstHalf.reduce(
    (sum, row) =>
      sum +
      includeChannel("meta", row.meta) +
      includeChannel("google_ads", row.google_ads) +
      includeChannel("tiktok", row.tiktok) +
      includeChannel("linkedin", row.linkedin),
    0,
  );
  const secondSpend = secondHalf.reduce(
    (sum, row) =>
      sum +
      includeChannel("meta", row.meta) +
      includeChannel("google_ads", row.google_ads) +
      includeChannel("tiktok", row.tiktok) +
      includeChannel("linkedin", row.linkedin),
    0,
  );
  const spendDelta = firstSpend > 0 ? ((secondSpend - firstSpend) / firstSpend) * 100 : 0;

  await admin
    .from("clients")
    .update({
      monthlySpend: Math.round(spend),
      conversions,
      spendDelta: Math.round(spendDelta * 10) / 10,
      roas: 0,
    })
    .eq("workspace_id", workspaceId)
    .eq("id", clientId);
}
