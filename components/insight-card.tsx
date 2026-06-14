import Link from "next/link";
import { AlertTriangle, ArrowRight, Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ChannelPill } from "./channel-pill";
import { ApproveInsightButton } from "./approve-insight-button";
import { DismissInsightButton } from "./dismiss-insight-button";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/catalog";

const iconByType = {
  recommendation: Sparkles,
  opportunity: TrendingUp,
  anomaly: AlertTriangle,
};

const tone = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-primary",
};

export function InsightCard({
  insight,
  compact = false,
  showApproval = true,
}: {
  insight: Insight;
  compact?: boolean;
  showApproval?: boolean;
}) {
  const Icon = iconByType[insight.type];
  return (
    <Card className={cn("group relative overflow-hidden border-l-[3px] p-5 transition-all hover:shadow-panel-lg", tone[insight.severity])}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            insight.type === "anomaly" && "bg-destructive/10 text-destructive",
            insight.type === "opportunity" && "bg-success/10 text-success",
            insight.type === "recommendation" && "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link href={`/clients/${insight.clientId}`} className="font-medium text-foreground hover:underline">
              {insight.client}
            </Link>
            <span>·</span>
            <ChannelPill channel={insight.channel} />
            <Badge
              variant={
                insight.severity === "high"
                  ? "destructive"
                  : insight.severity === "medium"
                    ? "warning"
                    : "soft"
              }
              className="capitalize"
            >
              {insight.severity}
            </Badge>
            <span className="ml-auto text-[11px]">{insight.createdAt}</span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug">{insight.title}</h3>
          {!compact && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>}
          {!compact && (
            <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <div className="mb-0.5 flex items-center gap-1.5 font-semibold text-foreground">
                <Lightbulb className="h-3.5 w-3.5 text-warning" /> Evidence
              </div>
              <div className="text-muted-foreground">{insight.evidence}</div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Est. impact:</span>{" "}
              <span className="font-semibold text-success">{insight.estImpact}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {showApproval && !insight.approved && <ApproveInsightButton insightId={insight.id} />}
              {insight.approved && (
                <Badge variant="success" className="text-2xs">
                  Approved
                </Badge>
              )}
              <DismissInsightButton insightId={insight.id} />
              <Button size="sm" className="h-8 gap-1">
                {insight.action.split("—")[0].split("→")[0].trim().slice(0, 22)}…
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
