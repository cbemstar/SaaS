import { TopbarSkeleton, PageHeaderSkeleton, KpiCardsSkeleton, ChartSkeleton, TableSkeleton } from "@/components/skeletons";

export default function ClientDetailLoading() {
  return (
    <>
      <TopbarSkeleton />
      <main className="flex-1 space-y-6 p-4 lg:p-6">
        <PageHeaderSkeleton />
        <KpiCardsSkeleton />
        <ChartSkeleton />
        <TableSkeleton />
      </main>
    </>
  );
}
