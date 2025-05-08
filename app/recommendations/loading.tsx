import { Skeleton } from "@/components/ui/skeleton"

export default function RecommendationsLoading() {
  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 text-center">
        <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-6 w-full max-w-3xl mx-auto" />
        <Skeleton className="h-6 w-5/6 max-w-2xl mx-auto mt-2" />
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Skeleton className="h-8 w-64 mb-6" />

          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-6 w-56" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>

            <Skeleton className="h-12 w-full max-w-xs mx-auto mt-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
