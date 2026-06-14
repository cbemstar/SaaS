import type { ChannelKey } from "@/lib/catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ConnectorCatalogItem } from "@/lib/data";

/**
 * Channels that are truly connected: OAuth token present AND connector not disconnected.
 * Status alone is not enough — stale demo rows and partial OAuth states can lie.
 */
export async function getAuthorizedConnectorChannels(workspaceId: string): Promise<ChannelKey[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  const [{ data: accounts }, { data: tokens }] = await Promise.all([
    admin.from("connector_accounts").select("channel, status").eq("workspace_id", workspaceId),
    admin.from("connector_tokens").select("channel, access_token").eq("workspace_id", workspaceId),
  ]);

  const tokenChannels = new Set(
    (tokens ?? [])
      .filter((row) => Boolean(row.access_token))
      .map((row) => row.channel as ChannelKey),
  );

  if (tokenChannels.size === 0) {
    return [];
  }

  return (accounts ?? [])
    .filter(
      (row) =>
        tokenChannels.has(row.channel as ChannelKey) &&
        (row.status === "connected" || row.status === "action_required"),
    )
    .map((row) => row.channel as ChannelKey);
}

export function authorizedChannelsFromCatalog(
  connectors: ConnectorCatalogItem[],
  tokenChannels: ChannelKey[],
): ChannelKey[] {
  const tokenSet = new Set(tokenChannels);
  return connectors
    .filter(
      (connector) =>
        tokenSet.has(connector.key) &&
        (connector.status === "connected" || connector.status === "action_required"),
    )
    .map((connector) => connector.key);
}

export async function getTokenBackedChannels(workspaceId: string): Promise<ChannelKey[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  const { data: tokens } = await admin
    .from("connector_tokens")
    .select("channel, access_token")
    .eq("workspace_id", workspaceId);

  return (tokens ?? [])
    .filter((row) => Boolean(row.access_token))
    .map((row) => row.channel as ChannelKey);
}
