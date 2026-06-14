import { reportSections } from "@/lib/report-sections";
import type { ReportTemplate } from "@/lib/catalog";

export const defaultReportBlocks = ["kpi", "ai", "perf", "mix", "conv"] as const;

export type ReportBlockId = (typeof reportSections)[number]["id"];

const blockIcons: Record<string, string> = {
  kpi: "LayoutGrid",
  ai: "Sparkles",
  perf: "LineChart",
  mix: "PieChart",
  conv: "TrendingUp",
  table: "Table",
  funnel: "Filter",
  recommendations: "ListChecks",
};

export function blocksForTemplate(template: ReportTemplate | undefined) {
  if (template?.sections?.length) {
    return template.sections.filter((id) => reportSections.some((section) => section.id === id));
  }
  return [...defaultReportBlocks];
}

export function reportBlockMeta(id: string) {
  const section = reportSections.find((item) => item.id === id);
  return {
    id,
    label: section?.label ?? id,
    description: section?.description ?? "",
    icon: blockIcons[id] ?? "Square",
  };
}

export function allReportBlocks() {
  return reportSections.map((section) => reportBlockMeta(section.id));
}

export function reportTitleForClient(clientName: string, template: ReportTemplate | undefined) {
  if (template?.name) {
    return `${clientName} — ${template.name}`;
  }
  return `${clientName} — Monthly Performance`;
}
