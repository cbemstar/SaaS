"use client";

import { Render, type Data } from "@measured/puck";
import { reportConfig } from "@/components/report-builder/report-blocks";
import { ReportDataProvider } from "@/components/report-builder/report-context";
import type { ReportData } from "@/lib/report-builder/types";

/** Read-only render of a saved report layout — used for preview and final output. */
export function ReportCanvas({ data, reportData }: { data: Data; reportData: ReportData | null }) {
  return (
    <ReportDataProvider value={reportData}>
      <Render config={reportConfig} data={data} />
    </ReportDataProvider>
  );
}
