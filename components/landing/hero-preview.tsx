import { AlertTriangle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function HeroPreview() {
  return (
    <div className="relative animate-fade-up stagger-3">
      <div className="absolute -inset-4 -z-10 rounded-2xl bg-primary/10 blur-3xl" />
      <div className="glass-panel overflow-hidden shadow-panel-lg">
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="type-code ml-1">app.korero.co.nz/dashboard</span>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="type-label">Kōwhai Coffee Co.</p>
              <p className="mt-1 font-display text-xl font-semibold tracking-tight">May 2026 · NZD $18,420</p>
            </div>
            <Badge variant="success" className="shrink-0 font-mono text-2xs">
              ROAS 4.2×
            </Badge>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Recommendation
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              Shift <strong>$1,240/wk</strong> from broad-match to brand campaigns. Expected lift{" "}
              <strong className="text-success">+$3,800 revenue/wk</strong>. Evidence: brand CPA $4.10 vs broad $62.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Spend", v: "$18.4k", d: "+12%" },
              { l: "Conv.", v: "624", d: "+18%" },
              { l: "CTR", v: "2.7%", d: "+0.4" },
              { l: "CPA", v: "$29", d: "-8%" },
            ].map((m) => (
              <div key={m.l} className="rounded-md border border-border/60 bg-background/50 px-2 py-2 text-center">
                <div className="type-label text-[10px]">{m.l}</div>
                <div className="mt-0.5 font-mono text-sm font-medium tabular-nums">{m.v}</div>
                <div className="font-mono text-2xs text-success">{m.d}</div>
              </div>
            ))}
          </div>
          <svg viewBox="0 0 320 72" className="h-[4.5rem] w-full" aria-hidden>
            <defs>
              <linearGradient id="hero-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,48 Q50,38 90,42 T170,28 T250,38 T320,16 L320,72 L0,72 Z" fill="url(#hero-chart-fill)" />
            <path
              d="M0,48 Q50,38 90,42 T170,28 T250,38 T320,16"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 hidden w-72 animate-float rounded-lg border border-border/80 bg-card p-3.5 shadow-panel-lg sm:block">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-warning/12 text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Meta CPM up 38%</p>
            <p className="truncate text-xs text-muted-foreground">Creative fatigue · Tōtara Outdoors</p>
          </div>
        </div>
      </div>
    </div>
  );
}
