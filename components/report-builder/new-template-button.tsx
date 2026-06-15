"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewTemplateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New report template", description: "Custom report", sections: ["kpi"] }),
      });
      const data = (await res.json()) as { template?: { id?: string } };
      if (data.template?.id) router.push(`/reports/builder/${data.template.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" className="gap-1.5" disabled={loading} onClick={() => void create()}>
      <Plus className="h-3.5 w-3.5" /> {loading ? "Creating…" : "New template"}
    </Button>
  );
}
