# Kōrero — Pricing & Positioning (AU/NZ)

Last updated: May 2026

## Positioning statement

Kōrero is an **AI-native agency reporting platform** for New Zealand and Australian marketing agencies. We compete on **total cost of ownership**, not per-seat or per-connector pricing — bundling all connectors, unlimited users, and AI insights on every plan.

**Tagline for sales:** *One bill. No connector tax.*

---

## Target customer

- Boutique to mid-size digital agencies (2–30 people)
- Managing 5–50 client accounts across Meta, Google Ads, GA4, LinkedIn, etc.
- Frustrated by AgencyAnalytics/DashThis cost scaling and Supermetrics DIY complexity
- Want client-ready PDF reports and actionable AI insights, not another BI tool

---

## Competitive landscape

| Competitor | Model | Starting price | Weakness Kōrero exploits |
|---|---|---|---|
| **AgencyAnalytics** | Per-client campaigns | ~$79–439 USD/mo | Costs scale linearly; AI on higher tiers only; extra for users |
| **DashThis** | Per-dashboard | ~$33–229 USD/mo | Per-dashboard scaling; limited AI |
| **Whatagraph** | Premium platform | ~$223+ USD/mo | Expensive; overkill for small AU/NZ agencies |
| **Supermetrics** | Per-connector ETL | ~€29+/source/mo | DIY; needs Looker/Sheets on top |
| **Jepto** (AU) | Marketing intelligence | Mid-tier SaaS | Less agency white-label focus |
| **Custom Looker/Power BI** | Project fees | $5k–50k+ | Not self-serve; high maintenance |

---

## Kōrero differentiation

1. **AI-native** — Evidence-cited insights with human-review gate; not a bolt-on upsell.
2. **All-inclusive flat pricing** — All 6 connectors + unlimited users on every plan.
3. **NZD-first** — Transparent NZD pricing, Pacific/Auckland timezone default, AU/NZ support hours.
4. **Modern self-serve UX** — Faster than Looker Studio + Supermetrics stack.
5. **Agency workflow** — Client-centric projects, report builder, insight approval — not generic BI.
6. **Founder pricing** — Waitlist/partner program for early AU/NZ agencies.

---

## Pricing tiers

| Plan | Price (NZD/mo) | Active client limit | Includes |
|---|---|---|---|
| **Solo** | $149 | 5 | All connectors, unlimited users, 2,000 AI credits/mo, white-label PDF |
| **Agency** | $499 | 25 | Everything in Solo + scheduled reports, Slack digest, priority support |
| **Scale** | $899+ | 50+ (100 cap in app) | Everything in Agency + SSO, custom domains, API access |

### Value metric

**Active clients** — the number of client records with `status = active` in a workspace. Archived clients do not count toward the limit.

### Per-client economics (Solo)

- ~$30/client/month at 5 clients
- AgencyAnalytics equivalent: ~$12–23/client but **plus** connector fees, user seats, and AI upsells
- Kōrero bundles AI + all connectors + unlimited seats → simpler TCO story

---

## Comparison messaging (landing / sales)

Use this table in sales conversations and on the marketing site:

| | Kōrero Solo | AgencyAnalytics | DashThis |
|---|---|---|---|
| **Price** | $149 NZD/mo flat | ~$79+ USD/mo + scaling | ~$33+ USD/mo + dashboards |
| **Connectors** | All 6 included | Pay per integration tier | Limited sources |
| **Users** | Unlimited | Extra cost | Per dashboard sharing |
| **AI insights** | Included | Higher tiers only | Limited |
| **NZ/AU support** | Yes, NZD billing | US-centric | US/EU-centric |

---

## Enforcement (product)

- `POST /api/clients` checks `getClientLimitForWorkspace()` before create
- Settings billing tab shows `{activeCount} / {limit} clients`
- Stripe checkout metadata includes `plan` name; webhook persists to `stripe_customers.plan`
- Default limit for workspaces without subscription: Solo (5 clients)

---

## GTM — early validation

1. Run 5–10 agency interviews (NZ + AU) with this pricing sheet
2. Offer **founder pricing** via waitlist: 30% off first year for design partners
3. Track: signup → first client created → first report sent → connector connected
4. Validate willingness to pay at $149 vs $99 anchor

---

## Open questions

- Should Scale be self-serve checkout or sales-led only? (Currently "Talk to us" on landing)
- AUD pricing parity or FX-adjusted?
- Annual discount (2 months free) — add in Phase 4+ billing

---

## Implementation references

- Plan definitions: `lib/billing.ts`
- Client limit check: `lib/clients.ts`
- Landing pricing: `app/page.tsx` `#pricing`
- Checkout: `app/api/billing/checkout/route.ts`
- Webhook: `app/api/billing/webhook/route.ts`
