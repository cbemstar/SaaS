import { NextResponse } from "next/server";
import { createStripeClient, getBillingReturnUrl, getWorkspaceSubscription } from "@/lib/billing";
import { canManageTeam, getMemberRole } from "@/lib/team";
import { getAuthenticatedUser, requireWorkspaceId } from "@/lib/workspace";

/** Opens the Stripe Customer Portal so users can update payment, change plan, or cancel. */
export async function POST() {
  const workspaceId = await requireWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getAuthenticatedUser();
  const role = user ? await getMemberRole(workspaceId, user.id) : null;
  if (!canManageTeam(role)) {
    return NextResponse.json({ error: "Only workspace owners or admins can manage billing." }, { status: 403 });
  }

  const stripe = createStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const subscription = await getWorkspaceSubscription(workspaceId);
  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — choose a plan first." }, { status: 400 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: getBillingReturnUrl(),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal failed", error);
    return NextResponse.json(
      { error: "Billing portal is not available yet. Enable the Customer Portal in your Stripe dashboard." },
      { status: 500 },
    );
  }
}
