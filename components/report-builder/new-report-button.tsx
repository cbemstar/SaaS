"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FilePlus2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PRESETS, type Preset } from "@/components/report-builder/presets";
import { cn } from "@/lib/utils";

function buildLayout(preset: Preset | null) {
  if (!preset) return { version: 2 as const, theme: { spacing: "comfortable" as const }, items: [] };
  return {
    version: 2 as const,
    theme: { spacing: "comfortable" as const },
    items: preset.items.map((it, i) => ({ ...it, id: `i_${i}_${Math.random().toString(36).slice(2, 8)}` })),
  };
}

export function NewReportButton({ variant = "default", label = "New report" }: { variant?: "default" | "outline"; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  async function create(preset: Preset | null) {
    const id = preset?.id ?? "blank";
    setCreatingId(id);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preset ? preset.label : "Untitled report",
          description: preset ? preset.description : "Custom report",
          sections: ["kpi"],
          layout: buildLayout(preset),
          status: "draft",
        }),
      });
      const data = (await res.json().catch(() => null)) as { template?: { id?: string }; error?: string } | null;
      if (!res.ok || !data?.template?.id) {
        toast.error(data?.error ?? "Could not create the report.");
        return;
      }
      router.push(`/reports/builder/${data.template.id}`);
    } catch {
      toast.error("Could not create the report.");
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Start a new report</DialogTitle>
          <DialogDescription>
            Pick a ready-made template to get a complete, editable layout — or start from a blank canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {/* Blank */}
          <button
            type="button"
            onClick={() => void create(null)}
            disabled={creatingId !== null}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60",
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              {creatingId === "blank" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4 text-muted-foreground" />}
              Blank report
            </span>
            <span className="text-sm text-muted-foreground">Start from scratch and add components yourself.</span>
          </button>

          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => void create(preset)}
              disabled={creatingId !== null}
              className="flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60"
            >
              <span className="flex items-center gap-2 font-medium">
                {creatingId === preset.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {preset.label}
              </span>
              <span className="text-sm text-muted-foreground">{preset.description}</span>
              <span className="mt-1 flex flex-wrap gap-1">
                {preset.sources.map((s) => (
                  <span key={s} className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                    {s}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
