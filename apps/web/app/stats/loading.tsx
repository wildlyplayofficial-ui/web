import { StatsGridSkeleton } from "@/components/skeleton";

export default function StatsLoading() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-12">
      <div className="animate-pulse mb-6 h-8 w-24 rounded-md bg-card-hover" />
      <StatsGridSkeleton />
      <div className="mt-6 animate-pulse rounded-card border border-line bg-card h-48" />
    </div>
  );
}
