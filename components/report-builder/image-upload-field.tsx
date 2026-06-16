"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import type { Field } from "@measured/puck";

function ImageUploadField({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/reports/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="max-h-32 rounded border border-border" />
      )}
      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60">
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
        <Upload className="h-3.5 w-3.5" />
        {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
      </label>
      <input
        type="text"
        value={value ?? ""}
        placeholder="or paste an image URL"
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function imageUploadField(): Field<string> {
  return {
    type: "custom",
    label: "Image",
    render: ({ value, onChange }) => <ImageUploadField value={value} onChange={onChange} />,
  };
}
