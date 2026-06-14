import type { ChannelKey } from "@/lib/catalog";

export type ConnectorGuide = {
  channel: ChannelKey;
  prerequisites: string[];
  steps: string[];
  envVars: string[];
  docPath?: string;
};

export const connectorGuides: Record<ChannelKey, ConnectorGuide> = {
  meta: {
    channel: "meta",
    prerequisites: [
      "Admin access to Meta Business Manager",
      "Ad accounts you want to report on",
      "Kōrero production URL approved in Meta App Review",
    ],
    steps: [
      "Click Connect and sign in with a Meta account that manages your ad accounts.",
      "Grant ads_read and business_management permissions.",
      "Select which ad accounts to link to each client in the client Settings tab.",
      "Run Sync to pull the last 30 days of performance.",
    ],
    envVars: ["META_APP_ID", "META_APP_SECRET"],
    docPath: "/docs/platform-approvals/meta-app-review.md",
  },
  google_ads: {
    channel: "google_ads",
    prerequisites: [
      "Google Ads MCC or client account access",
      "Google Ads developer token (Basic or Standard access)",
      "OAuth client configured in Google Cloud Console",
    ],
    steps: [
      "Click Connect and choose the Google account with Ads access.",
      "Approve read access for Google Ads reporting scopes.",
      "Map Google Ads customer IDs to clients in client Settings.",
      "Run Sync to import campaign metrics.",
    ],
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    docPath: "/docs/platform-approvals/google-ads-developer-token.md",
  },
  linkedin: {
    channel: "linkedin",
    prerequisites: ["LinkedIn Campaign Manager admin access", "LinkedIn developer app with Marketing API"],
    steps: [
      "Connect your LinkedIn account with ads reporting permissions.",
      "Select ad accounts to sync.",
      "Map accounts to clients and run Sync.",
    ],
    envVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  },
  tiktok: {
    channel: "tiktok",
    prerequisites: ["TikTok Ads Manager access", "TikTok Marketing API app credentials"],
    steps: [
      "Connect via TikTok Business authorization.",
      "Select advertiser accounts.",
      "Map to clients and sync performance data.",
    ],
    envVars: ["TIKTOK_APP_ID", "TIKTOK_APP_SECRET"],
  },
  ga4: {
    channel: "ga4",
    prerequisites: [
      "Google Analytics 4 property Viewer access or higher",
      "Google Cloud OAuth client (same as other Google connectors)",
      "Analytics Data API and Analytics Admin API enabled in Cloud Console",
    ],
    steps: [
      "In Google Cloud Console, enable Analytics Data API and Analytics Admin API.",
      "Add redirect URI: {APP_URL}/api/connectors/ga4/callback",
      "Click Connect on GA4 and sign in with a Google account that can view the property.",
      "On the client Settings tab, add GA4 as a tracked channel and map the numeric property ID.",
      "Run Sync on the GA4 connector card to import the last 30 days of sessions.",
    ],
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  search_console: {
    channel: "search_console",
    prerequisites: [
      "Verified site ownership in Google Search Console",
      "Google Cloud OAuth client configured",
      "Search Console API enabled in Cloud Console",
    ],
    steps: [
      "In Google Cloud Console, enable the Search Console API.",
      "Add redirect URI: {APP_URL}/api/connectors/search_console/callback",
      "Click Connect on Search Console and approve webmasters.readonly access.",
      "On the client Settings tab, add Search Console as a tracked channel and map the exact site URL.",
      "Run Sync to import daily search clicks for the last 30 days.",
    ],
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
};
