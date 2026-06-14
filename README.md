# Kōrero — clickable prototype

AI-native marketing reporting platform for NZ & AU agencies. This repo is the
frontend-first clickable prototype — fully designed UI with mocked data, ready
to swap in real connectors when API approvals (Meta App Review, Google Ads
developer token) land.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 3 + shadcn-style primitives (inline, no CLI)
- Recharts for dashboards
- next-themes (light + dark)
- lucide-react icons

## Quick start

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) (landing) or
[http://localhost:3000/dashboard](http://localhost:3000/dashboard) (app).

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page |
| `/dashboard` | Agency overview, KPIs, AI insights |
| `/insights` | Weekly brief + filterable insights |
| `/clients` | Client list |
| `/clients/[id]` | Client detail (overview, channels, insights, reports, settings) |
| `/reports` | Report builder + preview, templates, scheduled, history |
| `/connectors` | Meta, Google Ads, LinkedIn, TikTok, GA4, GSC |
| `/settings` | Workspace, branding, AI guardrails, billing, team |

## Where the data lives

All mock data is in [`lib/mock-data.ts`](./lib/mock-data.ts). This is the swap
point — when real connectors are wired up, replace the exports with the
real adapters. Component code never knows the difference.

## Design system

Supabase-inspired: zinc neutrals, emerald accent, dark-first UI.

- **Colors** — CSS variables in `app/globals.css` (`--primary` ≈ Supabase green).
- **Type** — **Manrope** (display), **Source Sans 3** (UI/body), **JetBrains Mono**
  (metrics, URLs) via `next/font/google`.
- **Primitives** — `components/ui/` (Button, Card, Badge, Tabs, …) follow
  shadcn conventions so you can drop in additional shadcn components later.

## Next steps (post-prototype)

1. Agency interviews (10–15) to validate pricing and channel must-haves.
2. Meta App Review + Google Ads developer-token applications (critical path).
3. Pick a backend — recommend Supabase (Postgres + auth + RLS) + Inngest /
   Vercel Cron for connector sync jobs.
4. Wire AI insights to Anthropic Claude API with guardrails described in the
   viability study (always cite evidence, human-review gate).
