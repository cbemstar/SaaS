import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reportSectionIds } from "@/lib/report-sections";
import type { ReportTemplateInsert, ReportTemplateRow } from "@/lib/supabase/types";

function slugifyTemplateId(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "template"}-${suffix}`;
}

export type TemplateInput = {
  name: string;
  description: string;
  sections: string[];
  accent?: string | null;
};

function sanitizeSections(sections: string[]) {
  const filtered = sections.filter((section) => reportSectionIds.includes(section));
  return filtered.length > 0 ? filtered : ["kpi", "ai", "perf"];
}

export async function createTemplate(workspaceId: string, input: TemplateInput): Promise<ReportTemplateRow> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }

  const sections = sanitizeSections(input.sections);
  const { data, error } = await admin
    .from("report_templates")
    .insert({
      id: slugifyTemplateId(input.name),
      workspace_id: workspaceId,
      name: input.name,
      description: input.description,
      pages: Math.max(1, Math.ceil(sections.length / 2)),
      used: 0,
      sections,
      accent: input.accent ?? null,
      is_default: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create template", error);
    throw error ?? new Error("Could not create template");
  }

  return data;
}

export async function updateTemplate(
  workspaceId: string,
  templateId: string,
  input: Partial<TemplateInput>,
): Promise<ReportTemplateRow> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }

  const patch: Partial<ReportTemplateInsert> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.accent !== undefined) patch.accent = input.accent;
  if (input.sections !== undefined) {
    const sections = sanitizeSections(input.sections);
    patch.sections = sections;
    patch.pages = Math.max(1, Math.ceil(sections.length / 2));
  }

  const { data, error } = await admin
    .from("report_templates")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", templateId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to update template", error);
    throw error ?? new Error("Could not update template");
  }

  return data;
}

export async function duplicateTemplate(workspaceId: string, templateId: string): Promise<ReportTemplateRow> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }

  const { data: source, error: sourceError } = await admin
    .from("report_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", templateId)
    .single();

  if (sourceError || !source) {
    throw sourceError ?? new Error("Template not found");
  }

  return createTemplate(workspaceId, {
    name: `${source.name} (copy)`,
    description: source.description,
    sections: source.sections ?? ["kpi", "ai", "perf"],
    accent: source.accent,
  });
}

export async function deleteTemplate(workspaceId: string, templateId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await admin
    .from("report_templates")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", templateId);

  if (error) {
    console.error("Failed to delete template", error);
    throw error;
  }
}
