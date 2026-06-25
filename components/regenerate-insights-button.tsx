"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RegenerateInsightsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/insights/generate", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not generate an insight.");
        return;
      }
      toast.success("New insight generated.");
      router.refresh();
    } catch {
      toast.error("Could not reach the AI service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={loading}
      onClick={() => void handleGenerate()}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      {loading ? "Generating…" : "Regenerate"}
    </Button>
  );
}
