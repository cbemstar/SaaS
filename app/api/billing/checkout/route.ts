import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createStripeClient, getCheckoutUrls, isPricingPlanName, pricingPlans } from "@/lib/billing";
import { requireWorkspaceId } from "@/lib/workspace";

const checkoutSchema = z.object({
  plan: z.string(),
  email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  const payload = checkoutSchema.parse(await request.json());
  const workspaceId = await requireWorkspaceId();

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPricingPlanName(payload.plan)) {
    return NextResponse.json({ error: "Unsupported plan" }, { status: 400 });
  }

  const stripe = createStripeClient();
  const plan = pricingPlans[payload.plan];

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: payload.email,
    metadata: {
      workspace_id: workspaceId,
      plan: payload.plan,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "nzd",
          recurring: {
            interval: "month",
          },
          product_data: {
            name: `Kōrero ${plan.name}`,
            description: plan.clientLimitLabel,
          },
          unit_amount: plan.amount,
        },
      },
    ],
    ...getCheckoutUrls(),
  });

  return NextResponse.json({ mode: "stripe", checkoutUrl: session.url });
}
