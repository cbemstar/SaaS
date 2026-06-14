# Google Ads Developer Token Checklist

## Required access

- Google Ads API developer token for read-only reporting.
- OAuth client with redirect URI: `/api/connectors/google_ads/callback`.
- GA4 and Search Console scopes can share the Google OAuth foundation if the user grants those scopes.

## Application evidence

- Public app URL from Vercel deployment.
- Privacy page: `/privacy`.
- Terms page: `/terms`.
- Demo account or screen recording showing `/connectors` and `/dashboard`.
- Explanation that the first release reads spend, conversion, campaign, and search metrics for reporting.

## Implementation readiness

- OAuth start route: `/api/connectors/google_ads/start`.
- OAuth callback route: `/api/connectors/google_ads/callback`.
- Scheduled sync route: `/api/cron/sync-connectors`.
- Required env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Submission notes

Describe the product as an agency reporting platform. The MVP does not write budgets, pause campaigns, or edit ads; AI recommendations are reviewed by a human before any client delivery.
