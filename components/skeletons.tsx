import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Layout-matched loading skeletons. These render inside the (app) layout so the
 * sidebar stays put; each includes a topbar stand-in so the chrome doesn't jump.
 */

export function TopbarSkeleton() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="hidden h-4 w-28 sm:block" />
        <div className="hidden h-5 w-px bg-border sm:block" />
        <Skeleton className="hidden h-4 w-40 sm:block" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="hidden h-8 w-28 md:block" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </header>
  );
}

export function KpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-panel space-y-3 p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("surface-panel space-y-4 p-5", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-32 rounded-md" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("surface-panel overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b px-5 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-[14rem]" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/** Generic page body used by the (app) group fallback. */
export function PageBodySkeleton() {
  return (
    <main className="flex-1 space-y-6 p-4 lg:p-6">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton />
      <TableSkeleton />
    </main>
  );
}

/** The grid editor shell — palette, canvas, config panel. */
export function ReportEditorSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="w-44 shrink-0 space-y-4 border-r p-3">
          {Array.from({ length: 3 }).map((_, g) => (
            <div key={g} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1 overflow-hidden bg-muted/30 p-4">
          <div className="mx-auto max-w-[920px] space-y-4 rounded-xl bg-card p-4 shadow-panel">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
        <aside className="w-80 shrink-0 space-y-3 border-l p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </aside>
      </div>
    </div>
  );
}

/** The print-ready report sheet — used for /reports/view and /r/[token]. */
export function ReportSheetSkeleton() {
  return (
    <main className="min-h-[100dvh] bg-muted/30 py-8">
      <div className="mx-auto max-w-[820px] space-y-6 rounded-xl border bg-card p-10 shadow-panel">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-72" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[78%]" />
        </div>
      </div>
    </main>
  );
}
