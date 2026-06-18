import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./ui/card";
import { cn, formatPercent } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  hint,
  invertDelta,
  spark,
  hideDelta,
}: {
  label: string;
  value: string;
  delta: number;
  hint?: string;
  invertDelta?: boolean;
  spark?: number[];
  hideDelta?: boolean;
}) {
  const positive = invertDelta ? delta < 0 : delta > 0;
  return (
    <Card className="group border-border/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-panel-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="type-label">{label}</p>
          <p className="type-metric mt-2 text-foreground">{value}</p>
        </div>
        {!hideDelta && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium tabular-nums",
              positive ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {formatPercent(Math.abs(delta))}
          </div>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      {spark && <Sparkline data={spark} positive={positive} />}
    </Card>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 100;
  const h = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const gradId = `spark-${positive ? "up" : "down"}`;
  return (
    <svg className="mt-4 h-8 w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#${gradId})`} />
    </svg>
  );
}
