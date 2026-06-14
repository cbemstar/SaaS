import type { ChannelKey } from "@/lib/catalog";
import { appUrl } from "@/lib/env";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export type OAuthExchangeResult =
  | { ok: true; tokens: TokenResponse }
  | { ok: false; error: string };

async function readOAuthError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string }; error_description?: string };
    return payload.error?.message ?? payload.error_description ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function exchangeOAuthCode(
  channel: ChannelKey,
  code: string,
  redirectUri: string,
): Promise<OAuthExchangeResult> {
  switch (channel) {
    case "meta": {
      if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
        return { ok: false, error: "META_APP_ID or META_APP_SECRET is not configured" };
      }
      const params = new URLSearchParams({
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      });
      const response = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${params.toString()}`);
      if (!response.ok) {
        const error = await readOAuthError(response);
        console.error("Meta OAuth token exchange failed", error);
        return { ok: false, error };
      }
      return { ok: true, tokens: (await response.json()) as TokenResponse };
    }
    case "google_ads":
    case "ga4":
    case "search_console": {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return { ok: false, error: "Google OAuth credentials are not configured" };
      }
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!response.ok) {
        const error = await readOAuthError(response);
        console.error("Google OAuth token exchange failed", error);
        return { ok: false, error };
      }
      return { ok: true, tokens: (await response.json()) as TokenResponse };
    }
    case "linkedin": {
      if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
        return { ok: false, error: "LinkedIn OAuth credentials are not configured" };
      }
      const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }),
      });
      if (!response.ok) {
        const error = await readOAuthError(response);
        console.error("LinkedIn OAuth token exchange failed", error);
        return { ok: false, error };
      }
      return { ok: true, tokens: (await response.json()) as TokenResponse };
    }
    default:
      return { ok: false, error: "OAuth is not implemented for this connector" };
  }
}

export function connectorRedirectUri(channel: ChannelKey) {
  return `${appUrl}/api/connectors/${channel}/callback`;
}
