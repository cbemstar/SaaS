"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PricingPlanName } from "@/lib/billing";

type SettingsCheckoutButtonProps = {
  plan: PricingPlanName;
  label?: string;
  className?: string;
  variant?: "default" | "outline";
};

export function SettingsCheckoutButton({
  plan,
  label = "Change plan",
  className,
  variant = "outline",
}: SettingsCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? "Could not start checkout");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size="sm" className={className} onClick={() => void startCheckout()} disabled={loading}>
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
