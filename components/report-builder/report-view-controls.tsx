"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReportViewControlsProps = {
  templateId: string;
  clients: Array<{ id: string; name: string }>;
  clientId: string;
  days: number;
};

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

export function ReportViewControls({ templateId, clients, clientId, days }: ReportViewControlsProps) {
  const router = useRouter();

  function go(nextClient: string, nextDays: number) {
    router.push(`/reports/view/${templateId}?client=${nextClient}&days=${nextDays}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={clientId} onValueChange={(value) => go(value, days)}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id} className="text-xs">
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(days)} onValueChange={(value) => go(clientId, Number(value))}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
