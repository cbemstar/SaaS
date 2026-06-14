export type ReportSection = {
  id: string;
  label: string;
  description: string;
};

export const reportSections: ReportSection[] = [
  { id: "kpi", label: "KPI summary", description: "Headline spend, conversions, ROAS and CPA with deltas." },
  { id: "ai", label: "AI executive summary", description: "Plain-English narrative grounded in the data, with citations." },
  { id: "perf", label: "Performance chart", description: "Daily spend split by channel across the period." },
  { id: "mix", label: "Channel mix", description: "Share of spend and conversions per channel." },
  { id: "conv", label: "Conversions trend", description: "Conversion volume and rate over time." },
  { id: "table", label: "Top campaigns table", description: "Best and worst performing campaigns by efficiency." },
  { id: "funnel", label: "Funnel breakdown", description: "Impressions to clicks to conversions per stage." },
  { id: "recommendations", label: "Recommendations", description: "Prioritised next actions with estimated impact." },
];

export const reportSectionIds = reportSections.map((section) => section.id);

export function sectionLabel(id: string) {
  return reportSections.find((section) => section.id === id)?.label ?? id;
}

export function isValidSection(id: string) {
  return reportSectionIds.includes(id);
}
