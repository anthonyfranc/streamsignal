import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function ReviewSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <div className="flex gap-1">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-4 w-4 rounded-full" />
                  ))}
              </div>
            </div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-48 mt-2" />
            <div className="space-y-2 mt-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommentSkeleton({ nested = false }: { nested?: boolean }) {
  return (
    <div className={`space-y-3 ${nested ? "pl-6 border-l-2 border-muted ml-3" : ""}`}>
      <div className="flex items-start gap-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <div className="flex-1 space-y-1">
          <div className="bg-muted/50 rounded-2xl px-3 py-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1 mt-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
          <div className="flex items-center gap-3 px-3">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommentFormSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-[60px] w-full rounded-xl" />
        <div className="flex justify-end">
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}

export function ReviewFormSkeleton() {
  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <div className="flex gap-1">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-7 w-7 rounded-full" />
                ))}
            </div>
          </div>

          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-[100px] w-full rounded-md" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <div className="flex gap-1">
                    {Array(5)
                      .fill(0)
                      .map((_, j) => (
                        <Skeleton key={j} className="h-5 w-5 rounded-full" />
                      ))}
                  </div>
                </div>
              ))}
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function NoReviewsSkeleton() {
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardHeader>
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto mt-1" />
      </CardHeader>
      <CardContent className="flex justify-center items-center py-8">
        <Skeleton className="h-16 w-16 rounded-md" />
      </CardContent>
    </Card>
  )
}
