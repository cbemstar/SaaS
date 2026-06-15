import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { additiveKeys, getSourceDef, type MetricSource } from "@/lib/metrics/catalog";
import { writeBreakdowns, writeDailyMetrics } from "@/lib/metrics/store";

type AdminClient = SupabaseClient<Database>;

const SOURCES: MetricSource[] = ["ga4", "search_console", "google_ads", "meta", "linkedin", "tiktok"];

// Per-source daily baselines for the additive metrics (derived metrics compute on read).
const BASE: Record<MetricSource, Record<string, number>> = {
  ga4: {
    total_users: 420, new_users: 260, active_users: 400, sessions: 610, engaged_sessions: 390,
    screen_page_views: 1850, event_count: 4200, key_events: 26, user_engagement_duration: 55000,
    total_revenue: 1600, transactions: 13, purchase_revenue: 1500,
  },
  search_console: { clicks: 130, impressions: 4200 },
  google_ads: { cost: 260, impressions: 9200, clicks: 310, conversions: 19, conversions_value: 1900 },
  meta: { spend: 185, impressions: 26000, clicks: 360, conversions: 15, reach: 18500 },
  linkedin: { spend: 95, impressions: 6200, clicks: 62, conversions: 5 },
  tiktok: { spend: 125, impressions: 41000, clicks: 520, conversions: 11, video_views: 31000 },
};

const DIMS: Record<MetricSource, Record<string, string[]>> = {
  ga4: {
    channel_group: ["Organic Search", "Direct", "Paid Search", "Referral", "Organic Social", "Email"],
    device: ["desktop", "mobile", "tablet"],
    country: ["New Zealand", "Australia", "United States", "United Kingdom"],
    landing_page: ["/", "/pricing", "/blog/seo-guide", "/contact", "/features"],
  },
  search_console: {
    country: ["nzl", "aus", "usa", "gbr"],
    device: ["DESKTOP", "MOBILE", "TABLET"],
    query: ["agency reporting", "marketing dashboard", "seo tool", "ppc report", "client reporting"],
    page: ["/", "/pricing", "/blog", "/features", "/contact"],
  },
  google_ads: {
    campaign: ["Brand", "Search - NZ", "Performance Max", "Display Remarketing"],
    device: ["DESKTOP", "MOBILE", "TABLET"],
  },
  meta: { campaign: ["Prospecting", "Retargeting", "Lookalike", "Brand Awareness"], device: ["mobile", "desktop"] },
  linkedin: { campaign: ["Sponsored Content", "Lead Gen", "Retargeting"], device: ["desktop", "mobile"] },
  tiktok: { campaign: ["Spark Ads", "Conversion", "Reach"], device: ["mobile"] },
};

function lastDays(count: number) {
  const days: Array<{ date: string; dow: number }> = [];
  const end = new Date();
  end.setDate(end.getDate() - 1);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), dow: d.getDay() });
  }
  return days;
}

function splitWeights(n: number) {
  const raw = Array.from({ length: n }, () => Math.random() + 0.25);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

const DAILY_DAYS = 400; // ~13 months so year-over-year comparison is testable
const BREAKDOWN_DAYS = 90; // breakdowns kept to a recent window to bound row counts

/** Seeds realistic sample metrics for one client across all sources. Idempotent (overwrites). */
export async function seedClientSampleData(admin: AdminClient, workspaceId: string, clientId: string) {
  const days = lastDays(DAILY_DAYS);
  const breakdownCutoff = days.length - BREAKDOWN_DAYS;

  for (const source of SOURCES) {
    const def = getSourceDef(source);
    if (!def) continue;
    const adds = additiveKeys(source);
    const breakdownMetrics = def.breakdownMetrics;

    const daily: Array<{ date: string; metrics: Record<string, number> }> = [];
    const breakdowns: Array<{ date: string; dimension_type: string; dimension_value: string; metrics: Record<string, number> }> = [];

    days.forEach(({ date, dow }, index) => {
      const weekend = dow === 0 || dow === 6 ? 0.65 : 1;
      const trend = 0.85 + (index / days.length) * 0.3;
      const noise = () => 0.8 + Math.random() * 0.4;

      const metrics: Record<string, number> = {};
      for (const key of adds) {
        if (key === "position_weight") continue;
        metrics[key] = Math.round((BASE[source][key] ?? 0) * weekend * trend * noise());
      }
      if (source === "search_console") {
        metrics.position_weight = Math.round(metrics.impressions * (8 + Math.random() * 8));
      }
      daily.push({ date, metrics });

      if (index < breakdownCutoff) return;
      for (const dim of def.dimensions) {
        const values = DIMS[source]?.[dim.type] ?? [];
        const weights = splitWeights(values.length);
        values.forEach((value, i) => {
          const m: Record<string, number> = {};
          for (const key of breakdownMetrics) m[key] = Math.round((metrics[key] ?? 0) * weights[i]);
          breakdowns.push({ date, dimension_type: dim.type, dimension_value: value, metrics: m });
        });
      }
    });

    await writeDailyMetrics(admin, workspaceId, clientId, source, daily);
    await writeBreakdowns(admin, workspaceId, clientId, source, breakdowns);
  }
}
