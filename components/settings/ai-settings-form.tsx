"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkspaceRow } from "@/lib/supabase/types";

type ToneValue = "concise" | "detailed" | "persuasive";

const tones: { value: ToneValue; label: string; description: string }[] = [
  { value: "concise", label: "Concise", description: "Short, scannable findings. Best for busy clients." },
  { value: "detailed", label: "Detailed", description: "Thorough analysis with supporting context." },
  { value: "persuasive", label: "Persuasive", description: "Outcome-led narrative that frames next steps." },
];

type AiSettingsFormProps = {
  workspace: WorkspaceRow;
};

export function AiSettingsForm({ workspace }: AiSettingsFormProps) {
  const router = useRouter();
  const [citeEvidence, setCiteEvidence] = useState(workspace.ai_cite_evidence ?? true);
  const [humanReview, setHumanReview] = useState(workspace.ai_human_review ?? true);
  const [tone, setTone] = useState<ToneValue>((workspace.ai_tone as ToneValue) ?? "concise");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    setState("saving");
    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ai_cite_evidence: citeEvidence,
        ai_human_review: humanReview,
        ai_tone: tone,
      }),
    });

    if (response.status === 401) {
      setState("error");
      return;
    }
    if (!response.ok) {
      setState("error");
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border p-3.5">
        <div>
          <div className="text-sm font-semibold">Always cite evidence</div>
          <p className="text-xs text-muted-foreground">Every recommendation must reference the source metrics behind it.</p>
        </div>
        <Switch checked={citeEvidence} onCheckedChange={setCiteEvidence} />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3.5">
        <div>
          <div className="text-sm font-semibold">Human review before client-facing</div>
          <p className="text-xs text-muted-foreground">Require approval before AI narratives appear in sent reports.</p>
        </div>
        <Switch checked={humanReview} onCheckedChange={setHumanReview} />
      </div>

      <div className="grid gap-1.5">
        <Label>Narrative tone</Label>
        <Select value={tone} onValueChange={(value) => setTone(value as ToneValue)}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tones.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{tones.find((option) => option.value === tone)?.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => void handleSave()} disabled={state === "saving"} className="gap-2">
          {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
          {state === "saving" ? "Saving…" : "Save AI settings"}
        </Button>
        {state === "saved" && <span className="text-sm text-success">Saved.</span>}
        {state === "error" && <span className="text-sm text-destructive">Could not save. Sign in and try again.</span>}
      </div>
    </div>
  );
}
