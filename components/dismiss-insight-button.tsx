"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DismissInsightButton({ insightId }: { insightId: string }) {
  const router = useRouter();

  async function handleDismiss() {
    await fetch(`/api/insights/${insightId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    });
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => void handleDismiss()}>
      Dismiss
    </Button>
  );
}
