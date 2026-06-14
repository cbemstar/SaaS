import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { connectorCatalog as defaultConnectors, reportTemplates as defaultTemplates } from "@/lib/mock-data";
import { appUrl, stripeSecretKey } from "@/lib/env";

export const pricingPlans = {
  Solo: {
    name: "Solo",
    amount: 14900,
    clientLimit: 5,
    clientLimitLabel: "Up to 5 clients",
    features: ["All connectors", "Unlimited users", "2,000 AI credits/mo", "White-label PDF"],
  },
  Agency: {
    name: "Agency",
    amount: 49900,
    clientLimit: 25,
    clientLimitLabel: "Up to 25 clients",
    features: ["Everything in Solo", "Scheduled reports", "Slack digest", "Priority support"],
  },
  Scale: {
    name: "Scale",
    amount: 89900,
    clientLimit: 100,
    clientLimitLabel: "50+ clients",
    features: ["Everything in Agency", "SSO", "Custom domains", "API access"],
  },
} as const;

export type PricingPlanName = keyof typeof pricingPlans;

export function isPricingPlanName(value: string): value is PricingPlanName {
  return value in pricingPlans;
}

export async function getClientLimitForWorkspace(workspaceId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return pricingPlans.Solo.clientLimit;
  }

  const { data } = await admin
    .from("stripe_customers")
    .select("plan")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const planName = data?.plan;
  if (planName && isPricingPlanName(planName)) {
    return pricingPlans[planName].clientLimit;
  }

  return pricingPlans.Solo.clientLimit;
}

export async function getWorkspacePlanName(workspaceId: string): Promise<PricingPlanName> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return "Solo";
  }

  const { data } = await admin
    .from("stripe_customers")
    .select("plan")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const planName = data?.plan;
  if (planName && isPricingPlanName(planName)) {
    return planName;
  }

  return "Solo";
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
    success_url: `${appUrl}/settings?checkout=success`,
    cancel_url: `${appUrl}/#pricing`,
  };
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
