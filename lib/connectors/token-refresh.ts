import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { readConnectorTokens, upsertConnectorToken } from "@/lib/connectors/store";

type AdminClient = SupabaseClient<Database>;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Meta access tokens from the OAuth code exchange are short-lived (~1h). We store
 * a long-lived (~60d) token at connect time; this refreshes (re-exchanges) it
 * when it's within 5 days of expiry. Falls back to the current token on any
 * failure so the caller hits the API and surfaces an auth error → reconnect.
 */
export async function getMetaAccessToken(admin: AdminClient, workspaceId: string): Promise<string | null> {
  const { access_token, expires_at } = await readConnectorTokens(admin, workspaceId, "meta");
  if (!access_token) return null;

  const expiresAt = expires_at ? new Date(expires_at).getTime() : null;
  const needsRefresh = expiresAt !== null && expiresAt < Date.now() + 5 * DAY;
  if (!needsRefresh) return access_token;
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) return access_token;

  try {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: access_token,
    });
    const res = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`);
    if (!res.ok) {
      console.error("Meta token refresh failed", res.status);
      return access_token;
    }
    const tokens = (await res.json()) as { access_token: string; expires_in?: number };
    await upsertConnectorToken(admin, workspaceId, "meta", {
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    });
    return tokens.access_token;
  } catch (error) {
    console.error("Meta token refresh error", error);
    return access_token;
  }
}

/**
 * LinkedIn access tokens last ~60d; refresh tokens (only issued to approved
 * Marketing apps) last ~1y. Refresh via the refresh_token grant when the access
 * token is near expiry and a refresh token is available.
 */
export async function getLinkedInAccessToken(admin: AdminClient, workspaceId: string): Promise<string | null> {
  const { access_token, refresh_token, expires_at } = await readConnectorTokens(admin, workspaceId, "linkedin");
  if (!access_token) return null;

  const expiresAt = expires_at ? new Date(expires_at).getTime() : null;
  const stillValid = expiresAt ? expiresAt > Date.now() + 60_000 : true;
  if (stillValid || !refresh_token) return access_token;
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) return access_token;

  try {
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });
    if (!res.ok) {
      console.error("LinkedIn token refresh failed", res.status);
      return access_token;
    }
    const tokens = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
    await upsertConnectorToken(admin, workspaceId, "linkedin", {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? refresh_token,
      expires_in: tokens.expires_in,
    });
    return tokens.access_token;
  } catch (error) {
    console.error("LinkedIn token refresh error", error);
    return access_token;
  }
}
