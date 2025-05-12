import { Skeleton } from "@/components/ui/skeleton"

export function ReviewCommentSkeleton({ hasReplies = false }: { hasReplies?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        {/* Avatar skeleton */}
        <Skeleton className="h-7 w-7 rounded-full" />

        <div className="flex-1 space-y-1">
          {/* Comment bubble */}
          <div className="bg-muted/50 rounded-2xl px-3 py-2">
            <div className="flex items-center justify-between">
              {/* Author name */}
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Comment content */}
            <div className="space-y-1 mt-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 px-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {hasReplies && (
        <div className="pl-6 space-y-3 border-l-2 border-muted ml-3">
          <div className="flex items-start gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="bg-muted/50 rounded-2xl px-3 py-2">
                <Skeleton className="h-4 w-20" />
                <div className="space-y-1 mt-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
              <div className="flex items-center gap-3 px-3">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
