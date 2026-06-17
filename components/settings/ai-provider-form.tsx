"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { AiUsage } from "@/lib/ai/usage";

type ByokProvider = "google" | "openai" | "anthropic";

type AiProviderFormProps = {
  initial: {
    provider: ByokProvider | null;
    model: string | null;
    baseUrl: string | null;
    keyHint: string | null;
    hasKey: boolean;
  };
  usage: AiUsage | null;
  encryptionConfigured: boolean;
};

const providerLabels: Record<ByokProvider, string> = {
  google: "Google Gemini",
  openai: "OpenAI-compatible (OpenAI, Groq, OpenRouter…)",
  anthropic: "Anthropic Claude",
};

const modelPlaceholders: Record<ByokProvider, string> = {
  google: "gemini-2.5-flash",
  openai: "llama-3.3-70b-versatile",
  anthropic: "claude-sonnet-4-6",
};

export function AiProviderForm({ initial, usage, encryptionConfigured }: AiProviderFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [provider, setProvider] = useState<ByokProvider>(initial.provider ?? "google");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.model ?? "");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleSave() {
    if (!apiKey.trim()) {
      toast.error("Enter your API key");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/workspace/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
        baseUrl: provider === "openai" && baseUrl.trim() ? baseUrl.trim() : undefined,
      }),
    });
    setSaving(false);
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error ?? "Could not save API key");
      return;
    }
    setApiKey("");
    toast.success("Your AI key is saved — generations now use your provider");
    router.refresh();
  }

  async function handleRemove() {
    const ok = await confirm({
      title: "Remove your AI key?",
      description: "Generations will fall back to Kōrero's metered AI credits on your plan.",
      confirmText: "Remove key",
      destructive: true,
    });
    if (!ok) return;
    setRemoving(true);
    const response = await fetch("/api/workspace/ai", { method: "DELETE" });
    setRemoving(false);
    if (!response.ok) {
      toast.error("Could not remove API key");
      return;
    }
    toast.success("Reverted to Kōrero AI credits");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Usage summary */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            {initial.hasKey ? (
              <>
                <p className="text-sm font-semibold">Using your own API key</p>
                <p className="text-xs text-muted-foreground">
                  AI generations are unmetered and billed directly by your provider.
                </p>
              </>
            ) : usage ? (
              <>
                <p className="text-sm font-semibold">
                  {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} AI credits this month
                </p>
                <p className="text-xs text-muted-foreground">
                  On the {usage.plan} plan. 1 credit = 1 AI generation. Resets monthly.
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold">AI credits</p>
            )}
          </div>
        </div>
        {!initial.hasKey && usage && (
          <Progress
            value={usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0}
            className="mt-3 h-1.5"
          />
        )}
      </div>

      {/* BYOK */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Bring your own AI key</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Use your own provider key for full control and to skip credit limits. Your key is encrypted at rest and never
          shown again. Leave this blank to use Kōrero&apos;s included AI credits (Google Gemini).
        </p>

        {!encryptionConfigured && (
          <div className="rounded-md border border-warning/40 bg-warning/[0.06] p-3 text-xs text-muted-foreground">
            Key storage is disabled until the server has an <code className="font-mono">AI_KEY_SECRET</code> configured.
          </div>
        )}

        <div className="grid gap-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as ByokProvider)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(providerLabels) as ByokProvider[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {providerLabels[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="byok-key">API key {initial.keyHint && <span className="text-muted-foreground">(saved: ••••{initial.keyHint})</span>}</Label>
          <Input
            id="byok-key"
            type="password"
            autoComplete="off"
            placeholder={initial.hasKey ? "Enter a new key to replace the saved one" : "Paste your provider API key"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={!encryptionConfigured}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="byok-model">Model (optional)</Label>
          <Input
            id="byok-model"
            placeholder={modelPlaceholders[provider]}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!encryptionConfigured}
          />
        </div>

        {provider === "openai" && (
          <div className="grid gap-1.5">
            <Label htmlFor="byok-base">Base URL (optional)</Label>
            <Input
              id="byok-base"
              placeholder="https://api.groq.com/openai/v1 · https://openrouter.ai/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={!encryptionConfigured}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for OpenAI. Set this to use a compatible provider like Groq or OpenRouter.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleSave()} disabled={saving || !encryptionConfigured} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial.hasKey ? "Replace key" : "Save key"}
          </Button>
          {initial.hasKey && (
            <Button variant="outline" onClick={() => void handleRemove()} disabled={removing}>
              {removing ? "Removing…" : "Remove key"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
