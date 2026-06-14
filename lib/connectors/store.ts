import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import { connectorCatalog as defaultConnectors } from "@/lib/mock-data";
import type { Database } from "@/lib/supabase/types";

type AdminClient = SupabaseClient<Database>;

type ConnectorStatus = "connected" | "action_required" | "disconnected";

function connectorLabel(channel: ChannelKey) {
  return defaultConnectors.find((item) => item.key === channel)?.label ?? channel;
}

export async function upsertConnectorToken(
  admin: AdminClient,
  workspaceId: string,
  channel: ChannelKey,
  tokens: { access_token: string; refresh_token?: string | null; expires_in?: number },
) {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  return admin.from("connector_tokens").upsert(
    {
      workspace_id: workspaceId,
      channel,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,channel" },
  );
}

export async function upsertConnectorAccount(
  admin: AdminClient,
  workspaceId: string,
  channel: ChannelKey,
  input: {
    status: ConnectorStatus;
    description: string;
    accounts?: number;
    lastSync?: string;
    tokenExpiresAt?: string | null;
  },
) {
  return admin.from("connector_accounts").upsert(
    {
      workspace_id: workspaceId,
      channel,
      label: connectorLabel(channel),
      description: input.description,
      status: input.status,
      accounts: input.accounts ?? (input.status === "connected" ? 1 : 0),
      last_sync: input.lastSync ?? (input.status === "connected" ? "Just connected" : "Never"),
      token_expires_at: input.tokenExpiresAt ?? null,
    },
    { onConflict: "workspace_id,channel" },
  );
}
