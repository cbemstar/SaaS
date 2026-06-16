"use client";

import dynamic from "next/dynamic";

// react-grid-layout + Tiptap are browser-only; load the editor client-side only
// (no SSR) to avoid server-render exceptions.
export const GridEditorClient = dynamic(
  () => import("@/components/report-builder/grid-editor").then((m) => m.GridEditor),
  {
    ssr: false,
    loading: () => <div className="p-8 text-sm text-muted-foreground">Loading editor…</div>,
  },
);
