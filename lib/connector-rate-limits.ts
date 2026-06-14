import type { ChannelKey } from "@/lib/catalog";

export type ConnectorRateLimitInfo = {
  hasRateLimits: boolean;
  severity: "low" | "medium" | "high";
  shortWarning: string;
  syncGuidance: string;
  docsUrl: string;
};

const rateLimits: Partial<Record<ChannelKey, ConnectorRateLimitInfo>> = {
  meta: {
    hasRateLimits: true,
    severity: "high",
    shortWarning: "Meta limits Ads Insights calls per ad account per hour (dev tier ≈600/hr).",
    syncGuidance:
      "Sync on demand only. Frequent syncs can throttle your app — Meta returns usage in X-FB-Ads-Insights-Throttle headers. Wait at least 15–30 minutes between manual syncs unless you need fresh data.",
    docsUrl: "https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/",
  },
  google_ads: {
    hasRateLimits: true,
    severity: "medium",
    shortWarning: "Google Ads API has daily operation quotas (Explorer: 2,880/day) plus per-second limits.",
    syncGuidance:
      "Each client sync uses a small number of SearchStream operations. Avoid syncing more than a few times per hour. Explorer developer tokens are capped at 2,880 operations per day against production accounts.",
    docsUrl: "https://developers.google.com/google-ads/api/docs/best-practices/quotas",
  },
  linkedin: {
    hasRateLimits: true,
    severity: "medium",
    shortWarning: "LinkedIn Marketing API enforces per-app rate limits.",
    syncGuidance: "Sync when you need updated numbers — not on a tight loop. Adapter coming soon.",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting",
  },
  tiktok: {
    hasRateLimits: true,
    severity: "medium",
    shortWarning: "TikTok Marketing API applies per-advertiser rate limits.",
    syncGuidance: "Sync on demand. Adapter coming soon.",
    docsUrl: "https://business-api.tiktok.com/portal/docs",
  },
  ga4: {
    hasRateLimits: true,
    severity: "low",
    shortWarning: "GA4 Data API has per-property quotas (e.g. tokens per hour).",
    syncGuidance: "Daily or weekly sync is usually enough for reporting. Adapter coming soon.",
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1/quotas",
  },
  search_console: {
    hasRateLimits: true,
    severity: "low",
    shortWarning: "Search Console API allows a limited number of queries per site per day.",
    syncGuidance: "Weekly sync is typical for SEO metrics. Adapter coming soon.",
    docsUrl: "https://developers.google.com/webmaster-tools/v1/limits",
  },
};

export function getConnectorRateLimitInfo(channel: ChannelKey): ConnectorRateLimitInfo {
  return (
    rateLimits[channel] ?? {
      hasRateLimits: false,
      severity: "low",
      shortWarning: "No documented rate limits for this connector.",
      syncGuidance: "Sync when you need fresh data.",
      docsUrl: "",
    }
  );
}

export function syncAllRateLimitNotice(connectedCount: number): string | null {
  if (connectedCount === 0) {
    return null;
  }

  return `Sync all pulls from ${connectedCount} connected source${connectedCount === 1 ? "" : "s"} and counts against each platform's API limits. Kōrero does not auto-sync — you control when data is refreshed.`;
}
