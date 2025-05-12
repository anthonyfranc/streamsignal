import { Skeleton } from "@/components/ui/skeleton"

export function ReviewSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Avatar skeleton */}
          <Skeleton className="h-10 w-10 rounded-full" />

          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                {/* Author name and rating */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex gap-0.5">
                    {Array(5)
                      .fill(null)
                      .map((_, i) => (
                        <Skeleton key={i} className="h-4 w-4 rounded-full" />
                      ))}
                  </div>
                </div>
                {/* Date */}
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Review title */}
            <Skeleton className="h-6 w-3/4" />

            {/* Review content */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Detailed ratings */}
            <Skeleton className="h-24 w-full rounded-lg" />

            {/* Action buttons */}
            <div className="flex items-center gap-4 mt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReviewSkeletonList() {
  return (
    <div className="space-y-5">
      {Array(3)
        .fill(null)
        .map((_, i) => (
          <ReviewSkeleton key={i} />
        ))}
    </div>
  )
}
