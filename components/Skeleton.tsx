interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`card-retro-static p-5 space-y-3 ${className}`}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonListingCard() {
  return (
    <div
      className="border-2 border-[var(--ink)] bg-[var(--bg-cream-alt)]"
      style={{ boxShadow: "4px 4px 0 0 #000" }}
    >
      <div className="skeleton aspect-square w-full" style={{ borderRadius: 0 }} />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-36 sm:w-48" />
        </div>
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonListingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRoom() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b-2 border-[var(--ink)] p-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="w-14 h-14" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <Skeleton className={`h-12 w-48 rounded-lg ${i % 2 === 0 ? "" : ""}`} />
          </div>
        ))}
      </div>
      <div className="border-t-2 border-[var(--ink)] p-4 flex gap-2">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-20 h-10 rounded-full" />
      </div>
    </div>
  );
}
