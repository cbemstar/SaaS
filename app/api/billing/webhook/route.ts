import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeClient } from "@/lib/billing";
import { stripeWebhookSecret } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type AdminClient = SupabaseClient<Database>;

function periodEndIso(sub: Stripe.Subscription): string | null {
  // current_period_end moved onto subscription items in recent API versions;
  // read whichever is present.
  const fromSub = (sub as unknown as { current_period_end?: number }).current_period_end;
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  const epoch = fromSub ?? fromItem;
  return epoch ? new Date(epoch * 1000).toISOString() : null;
}

/** Resolve the workspace a subscription belongs to (metadata first, then stored customer). */
async function resolveWorkspaceId(admin: AdminClient, sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.workspace_id;
  if (fromMeta) return fromMeta;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const { data } = await admin
    .from("stripe_customers")
    .select("workspace_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.workspace_id ?? null;
}

/** Upsert the workspace's billing row from a subscription object. */
async function syncSubscription(admin: AdminClient, sub: Stripe.Subscription) {
  const workspaceId = await resolveWorkspaceId(admin, sub);
  if (!workspaceId) {
    console.error("Stripe subscription event without resolvable workspace", sub.id);
    return;
  }
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  // Prefer the plan tagged on the active price (survives portal plan switches),
  // then the subscription metadata set at checkout.
  const pricePlan = sub.items?.data?.[0]?.price?.metadata?.plan;
  const plan = pricePlan || sub.metadata?.plan || null;

  const { error } = await admin.from("stripe_customers").upsert(
    {
      workspace_id: workspaceId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: periodEndIso(sub),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );
  if (error) console.error("Failed to sync Stripe subscription", error);
}

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

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    // 500 so Stripe retries once the DB is reachable again.
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspace_id;
        if (!workspaceId) {
          console.error("Stripe checkout completed without workspace metadata");
          break;
        }
        if (typeof session.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          // Make sure the subscription carries workspace/plan metadata so later
          // subscription.* events resolve correctly.
          if (!sub.metadata?.workspace_id) {
            const meta = { workspace_id: workspaceId, plan: session.metadata?.plan ?? "" };
            await stripe.subscriptions.update(sub.id, { metadata: meta });
            sub.metadata = { ...sub.metadata, ...meta };
          }
          await syncSubscription(admin, sub);
        } else {
          await admin.from("stripe_customers").upsert(
            {
              workspace_id: workspaceId,
              stripe_customer_id: String(session.customer),
              plan: session.metadata?.plan ?? null,
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id" },
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(admin, event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (typeof invoice.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await syncSubscription(admin, sub);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler error", event.type, error);
    // 500 → Stripe retries; signature is already verified so this is safe.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
