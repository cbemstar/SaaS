import { NextResponse, type NextRequest } from "next/server";
import { createStripeClient } from "@/lib/billing";
import { stripeWebhookSecret } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const stripe = createStripeClient();

  if (!stripe || !stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (event.type === "checkout.session.completed" && supabase) {
    const session = event.data.object;
    const workspaceId = session.metadata?.workspace_id;

    if (!workspaceId) {
      console.error("Stripe checkout completed without workspace metadata");
      return NextResponse.json({ received: true });
    }

    const { error } = await supabase.from("stripe_customers").upsert([{
      workspace_id: workspaceId,
      stripe_customer_id: String(session.customer),
      stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
      plan: session.metadata?.plan ?? null,
      status: session.status,
    }]);

    if (error) {
      console.error("Failed to persist Stripe customer", error);
    }
  }

  return NextResponse.json({ received: true });
}
