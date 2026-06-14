import { appUrl } from "@/lib/env";
import type { ChannelKey } from "@/lib/catalog";

export const oauthConnectorKeys = ["meta", "google_ads", "linkedin", "tiktok", "ga4", "search_console"] as const;

export function isConnectorKey(value: string): value is ChannelKey {
  return (oauthConnectorKeys as readonly string[]).includes(value);
}

export function getConnectorAuthorizeUrl(channel: ChannelKey, state: string) {
  const redirectUri = `${appUrl}/api/connectors/${channel}/callback`;

  switch (channel) {
    case "meta":
      return `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(process.env.META_APP_ID ?? "")}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=ads_read,business_management`;
    case "google_ads":
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID ?? "")}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent&state=${state}&scope=${encodeURIComponent("https://www.googleapis.com/auth/adwords")}`;
    case "ga4":
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID ?? "")}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent&state=${state}&scope=${encodeURIComponent("https://www.googleapis.com/auth/analytics.readonly")}`;
    case "search_console":
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID ?? "")}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent&state=${state}&scope=${encodeURIComponent("https://www.googleapis.com/auth/webmasters.readonly")}`;
    case "linkedin":
      return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(process.env.LINKEDIN_CLIENT_ID ?? "")}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent("r_ads r_ads_reporting")}`;
    case "tiktok":
      return `https://business-api.tiktok.com/portal/auth?app_id=${encodeURIComponent(process.env.TIKTOK_APP_ID ?? "")}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    default: {
      const exhaustive: never = channel;
      return exhaustive;
    }
  }
}

export function connectorHasCredentials(channel: ChannelKey) {
  switch (channel) {
    case "meta":
      return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
    case "google_ads":
    case "ga4":
    case "search_console":
      return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case "linkedin":
      return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    case "tiktok":
      return Boolean(process.env.TIKTOK_APP_ID && process.env.TIKTOK_APP_SECRET);
    default: {
      const exhaustive: never = channel;
      return exhaustive;
    }
  }
}
