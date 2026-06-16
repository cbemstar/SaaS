"use client";

import "@measured/puck/puck.css";
import "@/components/report-builder/report-builder.css";
import { Puck, type Data } from "@measured/puck";
import { useRouter } from "next/navigation";
import { reportConfig } from "@/components/report-builder/report-blocks";
import { ReportDataProvider } from "@/components/report-builder/report-context";
import type { ReportData } from "@/lib/report-builder/types";

type ReportEditorProps = {
  templateId: string;
  initialData: Data;
  reportData: ReportData | null;
};

export function ReportEditor({ templateId, initialData, reportData }: ReportEditorProps) {
  const router = useRouter();

  async function save(data: Data) {
    await fetch(`/api/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: data }),
    }).catch(() => {});
    router.refresh();
  }

  return (
    <ReportDataProvider value={reportData}>
      <Puck config={reportConfig} data={initialData} onPublish={(data) => void save(data)} />
    </ReportDataProvider>
  );
}
