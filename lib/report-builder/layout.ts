// Server-safe report layout types + guards. No "use client" and no heavy/browser
// imports, so server components (builder/view/share pages) can import these
// without pulling the client-only registry (Tiptap/recharts/react-grid-layout).

export type ComponentType =
  | "heading"
  | "text"
  | "image"
  | "divider"
  | "spacer"
  | "client_header"
  | "kpi"
  | "chart"
  | "combo"
  | "stacked"
  | "scatter"
  | "pie"
  | "table"
  | "breakdown"
  | "metric_grid"
  | "ai_summary"
  | "ai_recommendations"
  | "ai_highlights"
  | "ai_whatchanged";

export type Cfg = Record<string, unknown>;

export type ReportTheme = {
  brandColor?: string;
  fontFamily?: string;
  pageBackground?: string;
  textColor?: string;
  spacing?: "compact" | "comfortable" | "spacious";
};

export type ReportItem = { id: string; type: ComponentType; x: number; y: number; w: number; h: number; config: Cfg };
export type ReportLayoutV2 = { version: 2; theme: ReportTheme; items: ReportItem[] };
export type EditorCtx = { clientId: string; days: number };

export function isV2(layout: unknown): layout is ReportLayoutV2 {
  return Boolean(layout && typeof layout === "object" && Array.isArray((layout as { items?: unknown }).items));
}
