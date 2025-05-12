import { Skeleton } from "@/components/ui/skeleton"

export function CommentSkeleton({ nested = false }: { nested?: boolean }) {
  return (
    <div className={`space-y-3 ${nested ? "pl-6 border-l-2 border-muted ml-3" : ""}`}>
      <div className="flex items-start gap-2">
        {/* Avatar skeleton */}
        <Skeleton className="h-7 w-7 rounded-full" />

        <div className="flex-1 space-y-1">
          <div className="bg-muted/50 rounded-2xl px-3 py-2">
            <div className="flex items-center justify-between">
              {/* Author name */}
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Comment content */}
            <div className="space-y-1 mt-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 px-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommentSkeletonList() {
  return (
    <div className="space-y-4">
      {/* Comment form skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="flex justify-end">
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton nested />
      </div>
    </div>
  )
}
