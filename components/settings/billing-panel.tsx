"use client";

import { useState } from "react";
import { AlertTriangle, Check, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SettingsCheckoutButton } from "@/components/settings-checkout-button";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { cn } from "@/lib/utils";
import type { PaidPlanName, PricingPlanName } from "@/lib/billing";
import type { AiUsage } from "@/lib/ai/usage";

type PlanCard = {
  name: PaidPlanName;
  monthly: number;
  clientLimitLabel: string;
  features: readonly string[];
  highlight?: boolean;
};

type SubscriptionInfo = {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
};

type BillingPanelProps = {
  plans: PlanCard[];
  currentPlan: PricingPlanName;
  clientCount: number;
  clientLimit: number;
  aiUsage?: AiUsage | null;
  subscription: SubscriptionInfo | null;
  canManage: boolean;
};

const planRank: Record<PricingPlanName, number> = { Free: 0, Solo: 1, Agency: 2, Scale: 3 };

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function BillingPanel({
  plans,
  currentPlan,
  clientCount,
  clientLimit,
  aiUsage,
  subscription,
  canManage,
}: BillingPanelProps) {
  const [annual, setAnnual] = useState(false);
  const usage = clientLimit > 0 ? Math.min(100, Math.round((clientCount / clientLimit) * 100)) : 0;
  const nearLimit = usage >= 80;
  const aiPct = aiUsage && aiUsage.limit > 0 ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100)) : 0;
  const aiNearLimit = aiPct >= 80;

  const isFree = currentPlan === "Free";
  const status = subscription?.status ?? null;
  const pastDue = status === "past_due";
  const periodDate = formatDate(subscription?.currentPeriodEnd ?? null);
  const renewLabel = subscription?.cancelAtPeriodEnd
    ? periodDate
      ? `Cancels on ${periodDate}`
      : "Cancels at period end"
    : periodDate
      ? `Renews on ${periodDate}`
      : null;

  const statusBadge = isFree
    ? { variant: "muted" as const, label: "Free plan" }
    : pastDue
      ? { variant: "warning" as const, label: "Payment due" }
      : subscription?.cancelAtPeriodEnd
        ? { variant: "warning" as const, label: "Canceling" }
        : { variant: "soft" as const, label: "Active" };

  return (
    <div className="space-y-6">
      {pastDue && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/[0.06] p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="font-medium">Your last payment failed</p>
            <p className="text-muted-foreground">Update your card to keep your plan active.</p>
          </div>
          {canManage && <ManageBillingButton label="Update payment" variant="default" />}
        </div>
      )}

      <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Current plan</div>
            <div className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold">
              {currentPlan}
              <Badge variant={statusBadge.variant} className="gap-1">
                {!isFree && !pastDue && !subscription?.cancelAtPeriodEnd && <Zap className="h-3 w-3" />}
                {statusBadge.label}
              </Badge>
            </div>
            {renewLabel ? (
              <p className="mt-1 text-sm text-muted-foreground">{renewLabel}</p>
            ) : isFree ? (
              <p className="mt-1 text-sm text-muted-foreground">Upgrade to unlock more clients and AI credits.</p>
            ) : null}
            {!isFree && subscription?.hasCustomer && canManage && (
              <div className="mt-3">
                <ManageBillingButton />
              </div>
            )}
          </div>
          <div className="w-full max-w-xs space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Active clients</span>
                <span className={cn("font-medium tabular-nums", nearLimit && "text-warning")}>
                  {clientCount} / {clientLimit}
                </span>
              </div>
              <Progress value={usage} />
              {nearLimit && (
                <p className="mt-1.5 text-xs text-warning">You are close to your plan limit — consider upgrading.</p>
              )}
            </div>
            {aiUsage && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">AI credits</span>
                  <span className={cn("font-medium tabular-nums", aiNearLimit && !aiUsage.byok && "text-warning")}>
                    {aiUsage.byok ? "Your own key" : `${aiUsage.used.toLocaleString()} / ${aiUsage.limit.toLocaleString()}`}
                  </span>
                </div>
                {!aiUsage.byok && <Progress value={aiPct} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {!canManage && (
        <p className="text-center text-sm text-muted-foreground">
          Only workspace owners or admins can change the plan.
        </p>
      )}

      <div className="flex items-center justify-center gap-3 text-sm">
        <span className={cn(!annual && "font-medium text-foreground", annual && "text-muted-foreground")}>Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((value) => !value)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            annual ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/10 transition-transform",
              annual ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
        <span className={cn(annual && "font-medium text-foreground", !annual && "text-muted-foreground")}>Annual</span>
        <Badge variant="success" className="ml-1">2 months free</Badge>
      </div>

      <p className="text-center text-xs text-muted-foreground">All prices in NZD, GST inclusive.</p>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          const monthlyEquivalent = annual ? Math.round((plan.monthly * 10) / 12) : plan.monthly;
          const isUpgrade = planRank[plan.name] > planRank[currentPlan];

          return (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-5 transition-colors",
                isCurrent ? "border-primary/50 ring-1 ring-primary/20" : plan.highlight && "border-primary/40 ring-1 ring-primary/15",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {plan.name}
                </span>
                {plan.highlight && (
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" /> Popular
                  </Badge>
                )}
              </div>
              <div className="mt-3 font-display text-3xl font-semibold tabular-nums">
                ${monthlyEquivalent}
                <span className="text-sm font-normal text-muted-foreground"> /mo NZD</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {annual ? `Billed annually · $${plan.monthly * 10}/yr` : "Billed monthly"}
              </p>
              <p className="mt-3 text-sm font-medium">{plan.clientLimitLabel}</p>
              <ul className="mt-3 flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  canManage && subscription?.hasCustomer ? (
                    <ManageBillingButton label="Manage plan" className="w-full" />
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  )
                ) : (
                  <SettingsCheckoutButton
                    plan={plan.name}
                    interval={annual ? "year" : "month"}
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    label={isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
