import { RepositoryCardSkeleton } from "@/components/trending/repository-card-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-64 rounded-lg bg-muted animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <RepositoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
