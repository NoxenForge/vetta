import { Skeleton } from "@/components/ui/skeleton";

export function RepoDetailSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4 max-w-md" />
          </div>
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="rounded-lg border p-6 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </main>
  );
}
