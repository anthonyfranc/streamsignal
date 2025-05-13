import { Skeleton } from "@/components/ui/skeleton"
import { Star } from "lucide-react"

export function ReviewSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 text-muted/30" />
                    ))}
                  </div>
                </div>
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
            </div>

            <Skeleton className="h-5 w-48 mt-3" />

            <div className="mt-2 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="flex items-center gap-4 mt-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
