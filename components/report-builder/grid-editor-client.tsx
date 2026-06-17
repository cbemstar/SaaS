"use client";

import dynamic from "next/dynamic";
import { ReportEditorSkeleton } from "@/components/skeletons";

// react-grid-layout + Tiptap are browser-only; load the editor client-side only
// (no SSR) to avoid server-render exceptions.
export const GridEditorClient = dynamic(
  () => import("@/components/report-builder/grid-editor").then((m) => m.GridEditor),
  {
    ssr: false,
    loading: () => <ReportEditorSkeleton />,
  },
);
