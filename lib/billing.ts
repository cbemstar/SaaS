import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { connectorCatalog as defaultConnectors, reportTemplates as defaultTemplates } from "@/lib/mock-data";
import { appUrl, stripeSecretKey } from "@/lib/env";
import type { StripeCustomerRow } from "@/lib/supabase/types";

export const pricingPlans = {
  // Default for every workspace without an active subscription.
  Free: {
    name: "Free",
    amount: 0,
    clientLimit: 1,
    clientLimitLabel: "1 client",
    aiCredits: 25,
    features: ["1 client", "All connectors", "25 AI credits/mo", "Bring your own AI key"],
  },
  // Launch pricing (NZD, GST-inclusive). Intentionally aggressive to win early
  // adoption; revisit after ~12 months once the base is established.
  Solo: {
    name: "Solo",
    amount: 2900,
    clientLimit: 5,
    clientLimitLabel: "Up to 5 clients",
    aiCredits: 200,
    features: ["Up to 5 clients", "All connectors", "Unlimited users", "200 AI credits/mo", "White-label reports", "Scheduled delivery"],
  },
  Agency: {
    name: "Agency",
    amount: 7900,
    clientLimit: 15,
    clientLimitLabel: "Up to 15 clients",
    aiCredits: 750,
    features: ["Up to 15 clients", "Everything in Solo", "750 AI credits/mo", "Priority support", "Extra clients $7/mo"],
  },
  Scale: {
    name: "Scale",
    amount: 19900,
    clientLimit: 50,
    clientLimitLabel: "Up to 50 clients",
    aiCredits: 2500,
    features: ["Up to 50 clients", "Everything in Agency", "2,500 AI credits/mo", "SSO & custom domain", "Extra clients $5/mo"],
  },
} as const;

export type PricingPlanName = keyof typeof pricingPlans;

/** Purchasable plans (Free is the default, not a checkout target). */
export const PAID_PLANS = ["Solo", "Agency", "Scale"] as const;
export type PaidPlanName = (typeof PAID_PLANS)[number];

/** Subscription statuses that still grant the paid plan (incl. grace period). */
const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isPricingPlanName(value: string): value is PricingPlanName {
  return value in pricingPlans;
}

export function isPaidPlanName(value: string): value is PaidPlanName {
  return (PAID_PLANS as readonly string[]).includes(value);
}

export function getAiCreditsForPlan(plan: PricingPlanName): number {
  return pricingPlans[plan].aiCredits;
}

/** Annual price = 10 months (2 months free) of the monthly amount. */
export function annualAmount(plan: PaidPlanName): number {
  return pricingPlans[plan].amount * 10;
}

/**
 * Live Stripe Price IDs per paid plan + interval (account calchub.tech).
 * Empty = checkout falls back to inline price_data at the plan's `amount`, so
 * pricing is always correct. Populate these with the launch-price catalog IDs
 * (lookup keys korero_<plan>_m / _y) to use the Stripe product catalog.
 */
export const STRIPE_PRICE_IDS: Record<PaidPlanName, { month: string; year: string }> = {
  Solo: { month: "price_1Tm9blBcmaVSn6Z1rP5Q0IFl", year: "price_1Tm9bmBcmaVSn6Z1RURW5Bok" },
  Agency: { month: "price_1Tm9boBcmaVSn6Z1KdPIRrlG", year: "price_1Tm9bqBcmaVSn6Z1bdOuGKgJ" },
  Scale: { month: "price_1Tm9bsBcmaVSn6Z1ZJZEQxer", year: "price_1Tm9btBcmaVSn6Z1MeLv9CXf" },
};

export function getStripePriceId(plan: PaidPlanName, interval: "month" | "year"): string | null {
  return STRIPE_PRICE_IDS[plan]?.[interval] || null;
}

export async function getWorkspaceSubscription(workspaceId: string): Promise<StripeCustomerRow | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("stripe_customers")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data ?? null;
}

/**
 * The workspace's effective plan. A paid plan only applies while the
 * subscription is in an entitled state; otherwise the workspace is Free.
 */
export async function getWorkspacePlanName(workspaceId: string): Promise<PricingPlanName> {
  const sub = await getWorkspaceSubscription(workspaceId);
  if (sub?.plan && isPaidPlanName(sub.plan) && sub.status && ENTITLED_STATUSES.has(sub.status)) {
    return sub.plan;
  }
  return "Free";
}

export async function getClientLimitForWorkspace(workspaceId: string) {
  const plan = await getWorkspacePlanName(workspaceId);
  return pricingPlans[plan].clientLimit;
}

export function createStripeClient() {
  if (!stripeSecretKey) {
    return null;
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });
}

export function getCheckoutUrls() {
  return {
    success_url: `${appUrl}/settings?tab=billing&checkout=success`,
    cancel_url: `${appUrl}/settings?tab=billing&checkout=cancelled`,
  };
}

export function getBillingReturnUrl() {
  return `${appUrl}/settings?tab=billing`;
}


export async function ensureDefaultConnectors(workspaceId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const rows = defaultConnectors.map((connector) => ({
    workspace_id: workspaceId,
    channel: connector.key,
    label: connector.label,
    description: connector.description,
    status: "disconnected" as const,
    accounts: 0,
    last_sync: "Never",
    token_expires_at: null,
  }));

  await admin.from("connector_accounts").upsert(rows, { onConflict: "workspace_id,channel" });
}

export async function ensureDefaultReportTemplates(workspaceId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const templateRows = defaultTemplates.map((template) => ({
    id: template.id,
    workspace_id: workspaceId,
    name: template.name,
    description: template.description,
    pages: template.pages,
    used: 0,
  }));

  await admin.from("report_templates").upsert(templateRows);
}
