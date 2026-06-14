import type { ChannelKey } from "@/lib/catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientConnectorLinkRow } from "@/lib/supabase/types";

export type ClientConnectorLinkView = {
  id: string;
  clientId: string;
  channel: ChannelKey;
  externalAccountId: string | null;
  externalAccountName: string | null;
};

function mapLink(row: ClientConnectorLinkRow): ClientConnectorLinkView {
  return {
    id: row.id,
    clientId: row.client_id,
    channel: row.channel,
    externalAccountId: row.external_account_id,
    externalAccountName: row.external_account_name,
  };
}

export async function listClientConnectorLinks(workspaceId: string, clientId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("client_connector_links")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .order("channel");

  if (error || !data) {
    console.error("Failed to list client connector links", error);
    return [];
  }

  return data.map(mapLink);
}

export async function upsertClientConnectorLink(
  workspaceId: string,
  clientId: string,
  input: {
    channel: ChannelKey;
    externalAccountId: string;
    externalAccountName?: string | null;
  },
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const externalAccountId = input.externalAccountId.trim();
  if (!externalAccountId) {
    throw new Error("Account ID is required");
  }

  const { data, error } = await admin
    .from("client_connector_links")
    .upsert(
      {
        workspace_id: workspaceId,
        client_id: clientId,
        channel: input.channel,
        external_account_id: externalAccountId,
        external_account_name: input.externalAccountName?.trim() || null,
      },
      { onConflict: "client_id,channel" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error("Could not save connector link");
  }

  return mapLink(data);
}

export async function deleteClientConnectorLink(workspaceId: string, clientId: string, channel: ChannelKey) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Database is not configured");
  }

  const { error } = await admin
    .from("client_connector_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId)
    .eq("channel", channel);

  if (error) {
    throw new Error("Could not remove connector link");
  }
}
