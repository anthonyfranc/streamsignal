import { Skeleton } from "@/components/ui/skeleton"
import { ReviewSkeletonList } from "./review-skeleton"

export function ServiceReviewsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Filter tabs skeleton */}
        <Skeleton className="h-10 w-full sm:w-96" />

        {/* Write review button skeleton */}
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Reviews list skeleton */}
      <ReviewSkeletonList />
    </div>
  )
}
