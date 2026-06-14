"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApproveInsightButton({ insightId }: { insightId: string }) {
  const router = useRouter();

  async function handleApprove() {
    await fetch(`/api/insights/${insightId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => void handleApprove()}>
      <Check className="h-3.5 w-3.5" />
      Approve
    </Button>
  );
}
