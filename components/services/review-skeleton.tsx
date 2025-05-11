import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface ReviewSkeletonProps {
  replyCount?: number
  nestedReplies?: boolean
}

export function ReviewSkeleton({ replyCount = 2, nestedReplies = true }: ReviewSkeletonProps) {
  return (
    <Card className="overflow-hidden mb-4">
      <CardContent className="p-0">
        <div className="flex items-start p-4 gap-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

          <div className="flex-1 min-w-0">
            {/* Author name and date */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Skeleton key={star} className="h-4 w-4" />
                    ))}
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>

            {/* Review title and content */}
            <Skeleton className="h-5 w-48 mt-3" />
            <div className="space-y-2 mt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-4 mt-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>

        {/* Replies section */}
        {replyCount > 0 && (
          <div className="px-4 pb-5 pt-2 border-t">
            <div className="space-y-5 mb-5">
              {Array.from({ length: replyCount }).map((_, index) => (
                <ReplySkeletonItem key={index} hasNestedReplies={nestedReplies && index === 0} />
              ))}
            </div>

            {/* Reply input skeleton */}
            <div className="flex items-start gap-3 mt-4">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-[60px] w-full rounded-md" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ReplySkeletonItemProps {
  depth?: number
  hasNestedReplies?: boolean
}

function ReplySkeletonItem({ depth = 0, hasNestedReplies = false }: ReplySkeletonItemProps) {
  return (
    <div className={`flex flex-col ${depth > 0 ? "ml-6 mt-4" : ""}`}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-3 relative">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="mt-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5 mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 ml-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {hasNestedReplies && (
        <div className="pl-4 border-l-2 border-gray-100 ml-4 mt-3">
          <ReplySkeletonItem depth={depth + 1} />
        </div>
      )}
    </div>
  )
}
