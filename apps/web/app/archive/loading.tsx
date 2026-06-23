import { PickCardSkeleton } from "@/components/skeleton";

export default function ArchiveLoading() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12">
      <div className="animate-pulse mb-6 h-8 w-40 rounded-md bg-card-hover" />
      <div className="flex flex-col gap-5">
        {[1, 2, 3].map((i) => (
          <PickCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
