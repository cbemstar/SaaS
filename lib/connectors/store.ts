import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import { connectorCatalog as defaultConnectors } from "@/lib/mock-data";
import type { Database } from "@/lib/supabase/types";
import { encryptSecretOrPlain, maybeDecryptSecret } from "@/lib/crypto";

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

  // OAuth tokens grant access to clients' ad/analytics accounts — encrypt at
  // rest (AES-256-GCM via AI_KEY_SECRET). Falls back to plaintext if no secret
  // is configured so the connector still works in dev.
  return admin.from("connector_tokens").upsert(
    {
      workspace_id: workspaceId,
      channel,
      access_token: encryptSecretOrPlain(tokens.access_token),
      refresh_token: tokens.refresh_token ? encryptSecretOrPlain(tokens.refresh_token) : null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,channel" },
  );
}

/**
 * Read and decrypt a connector's stored OAuth tokens. Tolerates legacy
 * plaintext rows written before encryption was enabled.
 */
export async function readConnectorTokens(
  admin: AdminClient,
  workspaceId: string,
  channel: ChannelKey,
): Promise<{ access_token: string | null; refresh_token: string | null; expires_at: string | null }> {
  const { data } = await admin
    .from("connector_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("channel", channel)
    .maybeSingle();

  return {
    access_token: maybeDecryptSecret(data?.access_token),
    refresh_token: maybeDecryptSecret(data?.refresh_token),
    expires_at: data?.expires_at ?? null,
  };
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
