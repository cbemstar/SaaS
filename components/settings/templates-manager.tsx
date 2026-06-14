"use client";

import { useState } from "react";
import { Check, Copy, FileBarChart2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reportSections, sectionLabel } from "@/lib/report-sections";
import { cn } from "@/lib/utils";
import type { ReportTemplate } from "@/lib/catalog";

type TemplatesManagerProps = {
  initialTemplates: ReportTemplate[];
};

type DraftState = {
  name: string;
  description: string;
  sections: string[];
};

const emptyDraft: DraftState = { name: "", description: "", sections: ["kpi", "ai", "perf"] };

export function TemplatesManager({ initialTemplates }: TemplatesManagerProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>(initialTemplates);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleCreate(draft: DraftState) {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (response.ok) {
      const { template } = (await response.json()) as { template: ReportTemplate };
      setTemplates((current) => [template, ...current]);
    } else {
      const payload = (await response.json()) as { error?: string };
      setNotice(payload.error ?? "Could not create template.");
    }
    setCreating(false);
  }

  async function handleUpdate(id: string, draft: DraftState) {
    const response = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setNotice(payload.error ?? "Could not update template.");
      setEditing(null);
      return;
    }

    const { template } = (await response.json()) as { template: ReportTemplate };
    setTemplates((current) => current.map((item) => (item.id === id ? template : item)));
    setEditing(null);
  }

  async function handleDuplicate(template: ReportTemplate) {
    setBusyId(template.id);
    const response = await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });

    if (response.ok) {
      const { template: created } = (await response.json()) as { template: ReportTemplate };
      setTemplates((current) => [created, ...current]);
    } else {
      const payload = (await response.json()) as { error?: string };
      setNotice(payload.error ?? "Could not duplicate template.");
    }
    setBusyId(null);
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (response.ok) {
      setTemplates((current) => current.filter((template) => template.id !== id));
    } else {
      const payload = (await response.json()) as { error?: string };
      setNotice(payload.error ?? "Could not delete template.");
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Report templates</h3>
          <p className="text-xs text-muted-foreground">Reusable layouts your team starts new client reports from.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New template
        </Button>
      </div>

      {notice && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{notice}</div>
      )}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <FileBarChart2 className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs text-muted-foreground">Create your first report template to speed up client reporting.</p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium leading-tight">{template.name}</h4>
                <Badge variant="muted" className="shrink-0 font-mono text-2xs">{template.pages}p</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.description || "No description"}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {(template.sections ?? []).slice(0, 4).map((section) => (
                  <span key={section} className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                    {sectionLabel(section)}
                  </span>
                ))}
                {(template.sections?.length ?? 0) > 4 && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                    +{(template.sections?.length ?? 0) - 4}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-2xs text-muted-foreground">Used {template.used}×</span>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(template)} aria-label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={busyId === template.id}
                    onClick={() => void handleDuplicate(template)}
                    aria-label="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={busyId === template.id}
                    onClick={() => void handleDelete(template.id)}
                    aria-label="Delete"
                  >
                    {busyId === template.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateDialog
        open={creating}
        title="New template"
        description="Choose the sections this report layout includes."
        initial={emptyDraft}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
      />

      <TemplateDialog
        open={editing !== null}
        title="Edit template"
        description="Update the name, description and sections."
        initial={
          editing
            ? { name: editing.name, description: editing.description, sections: editing.sections ?? [] }
            : emptyDraft
        }
        onClose={() => setEditing(null)}
        onSubmit={(draft) => {
          if (editing) {
            return handleUpdate(editing.id, draft);
          }
        }}
      />

      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}

type TemplateDialogProps = {
  open: boolean;
  title: string;
  description: string;
  initial: DraftState;
  onClose: () => void;
  onSubmit: (draft: DraftState) => void | Promise<void>;
};

function TemplateDialog({ open, title, description, initial, onClose, onSubmit }: TemplateDialogProps) {
  const [draft, setDraft] = useState<DraftState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Re-sync the draft whenever a different template is opened.
  const key = `${title}-${initial.name}-${open}`;
  const [renderKey, setRenderKey] = useState(key);
  if (renderKey !== key) {
    setRenderKey(key);
    setDraft(initial);
    setTouched(false);
  }

  function toggleSection(id: string) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.includes(id)
        ? current.sections.filter((section) => section !== id)
        : [...current.sections, id],
    }));
  }

  async function submit() {
    if (!draft.name.trim()) {
      setTouched(true);
      return;
    }
    setSubmitting(true);
    await onSubmit({ ...draft, name: draft.name.trim() });
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Monthly Performance"
            />
            {touched && !draft.name.trim() && <p className="text-xs text-destructive">A name is required.</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              rows={2}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Full-channel monthly report with executive summary."
            />
          </div>
          <div className="grid gap-2">
            <Label>Sections</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {reportSections.map((section) => {
                const checked = draft.sections.includes(section.id);
                return (
                  <button
                    type="button"
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                      checked ? "border-primary/50 bg-primary/5" : "hover:bg-accent/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="block text-xs font-medium">{section.label}</span>
                      <span className="block text-2xs text-muted-foreground">{section.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" className="gap-1.5" disabled={submitting} onClick={() => void submit()}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
