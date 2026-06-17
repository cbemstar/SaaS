import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelKey } from "@/lib/catalog";
import type { Database } from "@/lib/supabase/types";
import { readConnectorTokens, upsertConnectorToken } from "@/lib/connectors/store";

type AdminClient = SupabaseClient<Database>;

const GOOGLE_CHANNELS = new Set<ChannelKey>(["google_ads", "ga4", "search_console"]);

export function isGoogleConnector(channel: ChannelKey) {
  return GOOGLE_CHANNELS.has(channel);
}

export async function getGoogleAccessToken(
  admin: AdminClient,
  workspaceId: string,
  channel: ChannelKey,
): Promise<string | null> {
  if (!isGoogleConnector(channel)) {
    return null;
  }

  const data = await readConnectorTokens(admin, workspaceId, channel);

  if (!data.access_token) {
    return null;
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null;
  const stillValid = expiresAt ? expiresAt > Date.now() + 60_000 : true;

  if (stillValid || !data.refresh_token) {
    return data.access_token;
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return data.access_token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error("Google token refresh failed", channel, response.status);
    return data.access_token;
  }

  const tokens = (await response.json()) as { access_token: string; expires_in?: number };
  await upsertConnectorToken(admin, workspaceId, channel, {
    access_token: tokens.access_token,
    refresh_token: data.refresh_token,
    expires_in: tokens.expires_in,
  });

  return tokens.access_token;
}
