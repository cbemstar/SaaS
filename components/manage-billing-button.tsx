"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

type ManageBillingButtonProps = {
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
};

export function ManageBillingButton({ label = "Manage billing", variant = "outline", className }: ManageBillingButtonProps) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not open billing portal");
      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open billing portal");
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size="sm" className={className} onClick={() => void openPortal()} disabled={loading}>
      <CreditCard className="h-3.5 w-3.5" />
      {loading ? "Opening…" : label}
    </Button>
  );
}
