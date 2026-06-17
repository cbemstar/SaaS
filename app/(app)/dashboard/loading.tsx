import { TopbarSkeleton, PageHeaderSkeleton, KpiCardsSkeleton, ChartSkeleton, TableSkeleton } from "@/components/skeletons";

export default function DashboardLoading() {
  return (
    <>
      <TopbarSkeleton />
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <PageHeaderSkeleton />
        <KpiCardsSkeleton />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <TableSkeleton rows={5} />
        </div>
      </main>
    </>
  );
}
