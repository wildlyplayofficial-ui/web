/** Reusable skeleton shimmer for loading states. */

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-card-hover ${className ?? ""}`}
    />
  );
}

/** Pick card skeleton — matches the PickCard layout. */
export function PickCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-5 w-16 rounded-pill" />
      </div>
      <Shimmer className="mt-3 h-6 w-3/4" />
      <div className="mt-4 flex gap-3">
        <Shimmer className="h-7 w-24 rounded-md" />
        <Shimmer className="h-4 w-40 self-center" />
      </div>
      <Shimmer className="mt-4 h-16 w-full" />
      <Shimmer className="mt-4 h-px w-full" />
      <Shimmer className="mt-3 h-3 w-48" />
    </div>
  );
}

/** Match card skeleton — matches the MatchCard layout. */
export function MatchCardSkeleton() {
  return (
    <div className="h-full rounded-card border border-line bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-12" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-4 w-4" />
        </div>
        <div className="flex items-center justify-between">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/** News card skeleton. */
export function NewsCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-card p-6 shadow-card">
      <Shimmer className="h-4 w-16 rounded-md" />
      <Shimmer className="mt-2 h-5 w-3/4" />
      <Shimmer className="mt-2 h-4 w-full" />
      <Shimmer className="mt-1 h-4 w-2/3" />
      <Shimmer className="mt-3 h-4 w-20" />
    </div>
  );
}

/** GoalLine card skeleton. */
export function GoalLineCardSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-5 py-8">
      <div className="mb-6 text-center">
        <Shimmer className="mx-auto h-4 w-32" />
        <Shimmer className="mx-auto mt-2 h-4 w-48" />
      </div>
      <div className="rounded-card border border-line bg-card p-4 shadow-card text-center">
        <Shimmer className="mx-auto h-3 w-20" />
        <Shimmer className="mx-auto mt-2 h-12 w-16" />
      </div>
      <div className="mt-6 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-card border border-line bg-card px-4 py-3">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="mt-1 h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stats grid skeleton. */
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-card border border-line bg-card px-5 py-4 text-center">
          <Shimmer className="mx-auto h-3 w-12" />
          <Shimmer className="mx-auto mt-2 h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
