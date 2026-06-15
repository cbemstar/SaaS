"use client";

import { createContext, useContext } from "react";
import type { ReportData } from "@/lib/report-builder/types";

const ReportDataContext = createContext<ReportData | null>(null);

export function ReportDataProvider({ value, children }: { value: ReportData | null; children: React.ReactNode }) {
  return <ReportDataContext.Provider value={value}>{children}</ReportDataContext.Provider>;
}

export function useReportData() {
  return useContext(ReportDataContext);
}
