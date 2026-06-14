import { cn } from "@/lib/utils";

export function BrandMark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-primary-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 18c4-10 12-10 16 0" />
          <circle cx="12" cy="13" r="1.6" fill="currentColor" />
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-semibold tracking-tight">Kōrero</span>
        {!compact && (
          <span className="rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
            Prototype
          </span>
        )}
      </div>
    </div>
  );
}
