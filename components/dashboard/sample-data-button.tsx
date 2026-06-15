"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Loads sample multi-source metrics for the workspace's clients so the dashboard
 * and report builder can be tested without connecting real accounts.
 */
export function SampleDataButton({ variant = "outline" }: { variant?: "outline" | "default" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/seed-metrics", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not load sample data");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sample data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={variant} size="sm" className="gap-1.5" disabled={loading} onClick={() => void load()}>
        <FlaskConical className="h-3.5 w-3.5" />
        {loading ? "Loading sample data…" : "Load sample data"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
