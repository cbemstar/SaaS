import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import {
  annualAmount,
  createStripeClient,
  getCheckoutUrls,
  getStripePriceId,
  getWorkspaceSubscription,
  isPaidPlanName,
  pricingPlans,
} from "@/lib/billing";
import { canManageTeam, getMemberRole } from "@/lib/team";
import { getAuthenticatedUser, requireWorkspaceId } from "@/lib/workspace";

const checkoutSchema = z.object({
  plan: z.string(),
  interval: z.enum(["month", "year"]).optional().default("month"),
});

export async function POST(request: NextRequest) {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Billing is an owner/admin action.
  const user = await getAuthenticatedUser();
  const role = user ? await getMemberRole(workspaceId, user.id) : null;
  if (!canManageTeam(role)) {
    return NextResponse.json({ error: "Only workspace owners or admins can manage billing." }, { status: 403 });
  }

  let payload: z.infer<typeof checkoutSchema>;
  try {
    payload = checkoutSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isPaidPlanName(payload.plan)) {
    return NextResponse.json({ error: "Unsupported plan" }, { status: 400 });
  }

  const stripe = createStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const plan = pricingPlans[payload.plan];
  const annual = payload.interval === "year";
  const existing = await getWorkspaceSubscription(workspaceId);

  const priceId = getStripePriceId(payload.plan, payload.interval);
  const inlineLineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: 1,
    price_data: {
      currency: "nzd",
      recurring: { interval: annual ? "year" : "month" },
      product_data: { name: `Kōrero ${plan.name}`, description: plan.clientLimitLabel },
      unit_amount: annual ? annualAmount(payload.plan) : plan.amount,
    },
  };

  const baseParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    // Reuse the workspace's Stripe customer if we have one; otherwise
    // subscription mode auto-creates one, seeded with the user's email.
    ...(existing?.stripe_customer_id
      ? { customer: existing.stripe_customer_id }
      : { customer_email: user?.email ?? undefined }),
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    metadata: { workspace_id: workspaceId, plan: payload.plan },
    subscription_data: { metadata: { workspace_id: workspaceId, plan: payload.plan } },
    ...getCheckoutUrls(),
  };

  async function createSession(lineItem: Stripe.Checkout.SessionCreateParams.LineItem) {
    return stripe!.checkout.sessions.create({ ...baseParams, line_items: [lineItem] });
  }

  try {
    // Prefer the real Stripe Price (live catalog). If it doesn't exist on the
    // active account (e.g. running under test keys), retry with an inline price
    // so test-mode checkout still works with dummy cards.
    let session;
    if (priceId) {
      try {
        session = await createSession({ price: priceId, quantity: 1 });
      } catch (priceError) {
        const code = (priceError as { code?: string })?.code;
        if (code === "resource_missing") {
          console.warn("Stripe price not found on this account; using inline price", priceId);
          session = await createSession(inlineLineItem);
        } else {
          throw priceError;
        }
      }
    } else {
      session = await createSession(inlineLineItem);
    }

    return NextResponse.json({ mode: "stripe", checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe checkout session failed", error);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
