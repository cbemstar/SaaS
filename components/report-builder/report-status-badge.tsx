import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/lib/catalog";

const MAP: Record<ReportStatus, { label: string; variant: "muted" | "soft" | "success" }> = {
  draft: { label: "Draft", variant: "muted" },
  ready: { label: "Ready", variant: "soft" },
  sent: { label: "Sent", variant: "success" },
};

export function ReportStatusBadge({ status }: { status?: ReportStatus }) {
  const s = MAP[status ?? "draft"];
  return (
    <Badge variant={s.variant} className="capitalize">
      {s.label}
    </Badge>
  );
}
