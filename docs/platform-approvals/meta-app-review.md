# Meta App Review Checklist

## Required access

- Marketing API read access for ad accounts, campaigns, ad sets, ads, insights, and creatives.
- Business Management scope where agencies connect multiple client ad accounts.
- Conversion API can be deferred unless design partners require event upload.

## Application evidence

- Public app URL from Vercel deployment.
- Privacy page: `/privacy`.
- Terms page: `/terms`.
- Screen recording showing connector flow from `/connectors`.
- Explanation that Kōrero reads reporting metrics and does not mutate campaign state in the first release.

## Implementation readiness

- OAuth start route: `/api/connectors/meta/start`.
- OAuth callback route: `/api/connectors/meta/callback`.
- Required env vars: `META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Submission notes

Position Kōrero as a reporting and insight product for agencies. Emphasize read-only analytics access, user-initiated account connection, and human review before client-facing reports.
