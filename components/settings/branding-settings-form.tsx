"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { WorkspaceRow } from "@/lib/supabase/types";

const presetAccents = ["#1f6f5c", "#2563eb", "#db2777", "#ea580c", "#7c3aed", "#0f766e", "#111827"];

type SaveState = "idle" | "saving" | "saved" | "error";

type BrandingSettingsFormProps = {
  workspace: WorkspaceRow;
};

export function BrandingSettingsForm({ workspace }: BrandingSettingsFormProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url ?? "");
  const [accent, setAccent] = useState(workspace.accent_color ?? "#1f6f5c");
  const [contact, setContact] = useState(workspace.primary_contact ?? "");
  const [footer, setFooter] = useState(workspace.report_footer ?? "");
  const [whiteLabel, setWhiteLabel] = useState(workspace.white_label ?? true);
  const [state, setState] = useState<SaveState>("idle");

  const initials = workspace.name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");

    const response = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logo_url: logoUrl ? logoUrl : null,
        accent_color: accent,
        primary_contact: contact ? contact : null,
        report_footer: footer ? footer : null,
        white_label: whiteLabel,
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <form onSubmit={(event) => void handleSave(event)} className="space-y-5">
        <div className="grid gap-1.5">
          <Label htmlFor="logo">Logo URL</Label>
          <Input
            id="logo"
            placeholder="https://cdn.youragency.co.nz/logo.svg"
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">PNG or SVG on a transparent background works best.</p>
        </div>

        <div className="grid gap-2">
          <Label>Accent colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {presetAccents.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAccent(preset)}
                aria-label={`Use ${preset}`}
                className={cn(
                  "relative h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                  accent.toLowerCase() === preset.toLowerCase() && "ring-2 ring-ring",
                )}
                style={{ backgroundColor: preset }}
              >
                {accent.toLowerCase() === preset.toLowerCase() && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                )}
              </button>
            ))}
            <label className="flex h-8 items-center gap-2 rounded-md border border-input px-2">
              <input
                type="color"
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Custom accent colour"
              />
              <span className="font-mono text-xs uppercase text-muted-foreground">{accent}</span>
            </label>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="contact">Primary contact</Label>
          <Input
            id="contact"
            placeholder="studio@youragency.co.nz"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="footer">Report footer</Label>
          <Textarea
            id="footer"
            rows={2}
            placeholder="Agency name · website · location"
            value={footer}
            onChange={(event) => setFooter(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Appears at the bottom of every exported report.</p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-3.5">
          <div>
            <div className="text-sm font-semibold">White-label reports</div>
            <p className="text-xs text-muted-foreground">Hide Kōrero branding so reports are fully yours.</p>
          </div>
          <Switch checked={whiteLabel} onCheckedChange={setWhiteLabel} />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={state === "saving"} className="gap-2">
            {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {state === "saving" ? "Saving…" : "Save branding"}
          </Button>
          {state === "saved" && <span className="text-sm text-success">Saved.</span>}
          {state === "error" && <span className="text-sm text-destructive">Could not save. Sign in and try again.</span>}
        </div>
      </form>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</Label>
        <div className="overflow-hidden rounded-xl border bg-card shadow-panel">
          <div className="flex items-center gap-3 p-5 text-white" style={{ backgroundColor: accent }}>
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/15 text-sm font-semibold backdrop-blur">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-contain" />
              ) : initials ? (
                initials
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider opacity-80">{workspace.name}</div>
              <div className="truncate font-display text-lg font-semibold leading-tight">Monthly Performance</div>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <div className="h-2.5 w-2/3 rounded-full bg-muted" />
            <div className="h-2.5 w-full rounded-full bg-muted" />
            <div className="h-2.5 w-4/5 rounded-full bg-muted" />
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-[10px] text-muted-foreground">
              <span className="truncate">{footer || "Your report footer will appear here"}</span>
              {!whiteLabel && <span className="shrink-0">Made with Kōrero</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
