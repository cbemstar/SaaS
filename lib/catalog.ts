import {
  channels,
  dailyPerformance as mockDailyPerformance,
  totals as mockTotals,
  type ChannelKey,
  type Client,
  type Insight,
} from "@/lib/mock-data";

export { channels };
export type { ChannelKey, Client, Insight };

export type DailyPerformancePoint = (typeof mockDailyPerformance)[number];
export type ReportTemplate = {
  id: string;
  name: string;
  description: string;
  pages: number;
  used: number;
  sections?: string[];
  accent?: string | null;
};
export type Totals = typeof mockTotals;
