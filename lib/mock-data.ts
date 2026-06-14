// Mocked data layer. Swap behind this interface when real APIs land.
// Naming and shape mirrors what we'll get from connector adapters.

export type ChannelKey = "meta" | "google_ads" | "linkedin" | "tiktok" | "ga4" | "search_console";

export const channels: Record<ChannelKey, { label: string; color: string; short: string }> = {
  meta: { label: "Meta (FB/IG)", color: "hsl(217 91% 60%)", short: "Meta" },
  google_ads: { label: "Google Ads", color: "hsl(35 92% 52%)", short: "Google" },
  linkedin: { label: "LinkedIn", color: "hsl(207 73% 38%)", short: "LinkedIn" },
  tiktok: { label: "TikTok", color: "hsl(340 75% 55%)", short: "TikTok" },
  ga4: { label: "GA4", color: "hsl(262 83% 58%)", short: "GA4" },
  search_console: { label: "Search Console", color: "hsl(152 60% 38%)", short: "GSC" },
};

export type Client = {
  id: string;
  name: string;
  industry: string;
  status: "active" | "onboarding" | "paused";
  monthlySpend: number;
  spendDelta: number;
  conversions: number;
  conversionsDelta: number;
  roas: number;
  lastReport: string;
  channels: ChannelKey[];
  alerts: number;
  initials: string;
  accent: string;
  contact_email?: string | null;
};

export const clients: Client[] = [
  {
    id: "kowhai",
    name: "Kōwhai Coffee Co.",
    industry: "F&B / DTC",
    status: "active",
    monthlySpend: 18420,
    spendDelta: 12.4,
    conversions: 624,
    conversionsDelta: 18.2,
    roas: 4.2,
    lastReport: "2 days ago",
    channels: ["meta", "google_ads", "tiktok"],
    alerts: 2,
    initials: "KC",
    accent: "from-amber-500/30 to-rose-500/30",
  },
  {
    id: "harbour",
    name: "Harbour & Co.",
    industry: "B2B SaaS",
    status: "active",
    monthlySpend: 42180,
    spendDelta: -4.1,
    conversions: 312,
    conversionsDelta: 9.8,
    roas: 6.1,
    lastReport: "yesterday",
    channels: ["google_ads", "linkedin", "ga4"],
    alerts: 1,
    initials: "HC",
    accent: "from-blue-500/30 to-teal-500/30",
  },
  {
    id: "kiwistay",
    name: "KiwiStay Holidays",
    industry: "Travel",
    status: "active",
    monthlySpend: 27650,
    spendDelta: 22.7,
    conversions: 871,
    conversionsDelta: 31.1,
    roas: 8.4,
    lastReport: "3 days ago",
    channels: ["meta", "google_ads", "ga4", "search_console"],
    alerts: 3,
    initials: "KS",
    accent: "from-cyan-500/30 to-emerald-500/30",
  },
  {
    id: "totara",
    name: "Tōtara Outdoors",
    industry: "Retail / Ecom",
    status: "active",
    monthlySpend: 31200,
    spendDelta: 6.3,
    conversions: 1042,
    conversionsDelta: -3.4,
    roas: 3.8,
    lastReport: "today",
    channels: ["meta", "google_ads", "tiktok", "ga4"],
    alerts: 4,
    initials: "TO",
    accent: "from-emerald-500/30 to-lime-500/30",
  },
  {
    id: "marlboroughwine",
    name: "Marlborough Wine Trail",
    industry: "F&B / Tourism",
    status: "onboarding",
    monthlySpend: 8200,
    spendDelta: 0,
    conversions: 84,
    conversionsDelta: 0,
    roas: 2.1,
    lastReport: "—",
    channels: ["meta", "google_ads"],
    alerts: 0,
    initials: "MW",
    accent: "from-rose-500/30 to-violet-500/30",
  },
  {
    id: "fernfit",
    name: "FernFit Studios",
    industry: "Health / Wellness",
    status: "active",
    monthlySpend: 11800,
    spendDelta: -8.2,
    conversions: 248,
    conversionsDelta: -12.0,
    roas: 3.1,
    lastReport: "4 days ago",
    channels: ["meta", "tiktok", "ga4"],
    alerts: 2,
    initials: "FF",
    accent: "from-green-500/30 to-emerald-500/30",
  },
  {
    id: "aotearoaauto",
    name: "Aotearoa Auto Group",
    industry: "Auto",
    status: "active",
    monthlySpend: 56400,
    spendDelta: 3.1,
    conversions: 198,
    conversionsDelta: 14.2,
    roas: 9.7,
    lastReport: "today",
    channels: ["meta", "google_ads", "search_console", "ga4"],
    alerts: 0,
    initials: "AA",
    accent: "from-slate-500/30 to-blue-500/30",
  },
  {
    id: "ruapehugear",
    name: "Ruapehu Gear",
    industry: "Retail / Ecom",
    status: "paused",
    monthlySpend: 0,
    spendDelta: 0,
    conversions: 0,
    conversionsDelta: 0,
    roas: 0,
    lastReport: "12 days ago",
    channels: ["meta", "google_ads"],
    alerts: 0,
    initials: "RG",
    accent: "from-zinc-500/30 to-slate-500/30",
  },
];

// 30-day daily series
export const dailyPerformance = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const base = 4200 + Math.sin(i / 3) * 800 + i * 40;
  return {
    date: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" }),
    meta: Math.round(base * 0.42 + Math.random() * 300),
    google_ads: Math.round(base * 0.38 + Math.random() * 220),
    tiktok: Math.round(base * 0.12 + Math.random() * 180),
    linkedin: Math.round(base * 0.08 + Math.random() * 140),
    ga4: Math.round(900 + Math.random() * 400),
    search_console: Math.round(120 + Math.random() * 80),
    conversions: Math.round(180 + Math.sin(i / 4) * 40 + Math.random() * 30 + i * 1.6),
  };
});

export const totals = {
  spend: dailyPerformance.reduce((a, d) => a + d.meta + d.google_ads + d.tiktok + d.linkedin, 0),
  conversions: dailyPerformance.reduce((a, d) => a + d.conversions, 0),
  roas: 5.4,
  ctr: 2.71,
  cpa: 38.4,
  spendDelta: 14.2,
  conversionsDelta: 18.7,
  roasDelta: 6.3,
  ctrDelta: -1.4,
  cpaDelta: -8.1,
};

export type Insight = {
  id: string;
  client: string;
  clientId: string;
  channel: ChannelKey;
  severity: "high" | "medium" | "low";
  type: "opportunity" | "anomaly" | "recommendation";
  title: string;
  body: string;
  action: string;
  evidence: string;
  estImpact: string;
  createdAt: string;
  approved?: boolean;
};

export const insights: Insight[] = [
  {
    id: "ins-1",
    client: "Kōwhai Coffee Co.",
    clientId: "kowhai",
    channel: "google_ads",
    severity: "high",
    type: "recommendation",
    title: "Shift $1,240/wk from broad-match to brand campaigns",
    body: "Brand search CPA is $4.10 with 11.4× ROAS — the strongest performer in the account. Broad-match non-brand is sitting at $62 CPA across the same 7 days. Reallocating capped impression-share budget toward brand and three top-performing exact-match terms is the lowest-risk lift available this week.",
    action: "Open Google Ads → Brand campaign → raise budget by NZD 177/day",
    evidence: "Brand: 1,420 clicks · $4.10 CPA · 11.4× ROAS · IS lost to budget 38%. Broad: 880 clicks · $62 CPA · 1.2× ROAS.",
    estImpact: "+$3,800 weekly revenue at current conv. rate",
    createdAt: "12 min ago",
  },
  {
    id: "ins-2",
    client: "Tōtara Outdoors",
    clientId: "totara",
    channel: "meta",
    severity: "high",
    type: "anomaly",
    title: "Meta CPM up 38% since Tuesday — creative fatigue likely",
    body: "Three of the four ad sets in the prospecting campaign show frequency above 4.2 with a sharp drop in CTR (1.9% → 0.7%) since Tuesday. CPM has climbed from $14.20 to $19.60 in the same window. This looks like creative fatigue, not auction pressure.",
    action: "Pause the two highest-frequency creatives, refresh with the two new UGC assets in Library",
    evidence: "Set A frequency 4.7, CTR -64% w/w. Set B frequency 4.3, CTR -58% w/w. Industry CPM benchmark unchanged.",
    estImpact: "Expected CPA reduction $22 → $14 within 5–7 days",
    createdAt: "1 hr ago",
  },
  {
    id: "ins-3",
    client: "Harbour & Co.",
    clientId: "harbour",
    channel: "linkedin",
    severity: "medium",
    type: "opportunity",
    title: "LinkedIn lookalike of converters is under-spending",
    body: "The 1% lookalike of top 200 closed-won accounts has a 3.4× higher MQL rate than the broad-targeted ABM campaign but is currently capped at 18% of campaign budget. With current CPMs there is room to triple spend before saturation.",
    action: "Raise LAL audience budget cap from $90 → $260/day, watch frequency for 7 days",
    evidence: "LAL: 42 MQLs · $118 CPL. Broad: 31 MQLs · $402 CPL. Audience size 240k, frequency 1.1.",
    estImpact: "+18–24 MQLs/month at current CPL",
    createdAt: "2 hrs ago",
  },
  {
    id: "ins-4",
    client: "KiwiStay Holidays",
    clientId: "kiwistay",
    channel: "ga4",
    severity: "high",
    type: "anomaly",
    title: "Bookings dropping out at payment step on iOS Safari",
    body: "Funnel drop-off at the payment step has gone from 14% to 41% on iOS Safari over 4 days. Android and desktop are flat. This pattern matches a recent Stripe Elements update that interacts badly with Safari's intelligent tracking prevention.",
    action: "Test checkout on iOS Safari, escalate to dev — likely Stripe Elements config change",
    evidence: "iOS Safari sessions: 8,420. Payment step drop-off 41% (was 14%). All other devices: 11–16%.",
    estImpact: "Recovering 50% of the gap = ~$28k/mo bookings",
    createdAt: "3 hrs ago",
  },
  {
    id: "ins-5",
    client: "FernFit Studios",
    clientId: "fernfit",
    channel: "tiktok",
    severity: "medium",
    type: "recommendation",
    title: "TikTok Spark Ads outperforming standard creative 3:1",
    body: "Spark Ads boosted from the brand's organic feed have a 3.1% CTR and $9 CPA vs. 0.9% and $34 for studio-shot in-feed ads. There are 6 organic posts with >50k views in the last 30 days that could be Spark-promoted.",
    action: "Whitelist the 6 highest-view organic posts and launch Spark Ads with $40/day each",
    evidence: "Spark: 1,840 clicks · $9 CPA. Standard: 980 clicks · $34 CPA.",
    estImpact: "+120 new members/month at current LTV",
    createdAt: "5 hrs ago",
  },
  {
    id: "ins-6",
    client: "Aotearoa Auto Group",
    clientId: "aotearoaauto",
    channel: "search_console",
    severity: "low",
    type: "opportunity",
    title: "11 pages on page-2 with high CTR potential",
    body: "Search Console shows 11 URLs ranked positions 11–18 for terms with combined 14,200 monthly searches and historical CTRs above the position-1 benchmark when the brand previously ranked. Targeted on-page work could lift these into top-10.",
    action: "Brief the SEO team on the 11 URLs, prioritise the 4 commercial-intent pages",
    evidence: "Avg position 14.1, impressions 142k/mo, current CTR 0.6%, top-10 CTR benchmark 6.4%.",
    estImpact: "Est. +6,200 monthly organic sessions if all 11 reach top 10",
    createdAt: "8 hrs ago",
  },
];

export const connectorCatalog = [
  {
    key: "meta" as ChannelKey,
    label: "Meta (Facebook & Instagram)",
    description: "Ad accounts, campaigns, ad sets, creatives, conversion API",
    status: "connected" as const,
    accounts: 6,
    lastSync: "12 min ago",
  },
  {
    key: "google_ads" as ChannelKey,
    label: "Google Ads",
    description: "Search, Performance Max, Display, Demand Gen, YouTube",
    status: "connected" as const,
    accounts: 8,
    lastSync: "8 min ago",
  },
  {
    key: "tiktok" as ChannelKey,
    label: "TikTok Ads",
    description: "Spark Ads, in-feed, top-view, conversion events",
    status: "connected" as const,
    accounts: 3,
    lastSync: "1 hr ago",
  },
  {
    key: "linkedin" as ChannelKey,
    label: "LinkedIn Ads",
    description: "Sponsored content, lead gen forms, audience network",
    status: "action_required" as const,
    accounts: 1,
    lastSync: "Re-auth required",
  },
  {
    key: "ga4" as ChannelKey,
    label: "Google Analytics 4",
    description: "Web + app events, attribution, audiences, ecommerce",
    status: "connected" as const,
    accounts: 7,
    lastSync: "4 min ago",
  },
  {
    key: "search_console" as ChannelKey,
    label: "Google Search Console",
    description: "Organic clicks, impressions, query and page reports",
    status: "connected" as const,
    accounts: 6,
    lastSync: "21 min ago",
  },
];

export const reportTemplates = [
  {
    id: "agency-monthly",
    name: "Monthly Performance",
    description: "Full-channel monthly report with executive summary and recommendations.",
    pages: 8,
    used: 64,
  },
  {
    id: "paid-only",
    name: "Paid Media Snapshot",
    description: "Meta + Google + TikTok weekly summary with budget pacing.",
    pages: 4,
    used: 42,
  },
  {
    id: "seo-organic",
    name: "Organic & SEO",
    description: "GSC + GA4 organic, page-level wins, keyword movement.",
    pages: 5,
    used: 18,
  },
  {
    id: "exec-summary",
    name: "Executive Summary",
    description: "One-page board-ready summary with AI narrative.",
    pages: 1,
    used: 87,
  },
];
