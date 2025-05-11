import { Skeleton } from "@/components/ui/skeleton"

export default function ServicesLoading() {
  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 text-center">
        <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-6 w-full max-w-3xl mx-auto" />
        <Skeleton className="h-6 w-5/6 max-w-2xl mx-auto mt-2" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-10 w-full md:w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24 md:w-32" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr]">
          <div className="hidden md:block">
            <div className="sticky top-20">
              <Skeleton className="h-8 w-40 mb-4" />
              <div className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ServiceCardSkeleton() {
  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Skeleton className="h-40 w-full" />
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-1/4" />
        </div>
        <Skeleton className="h-4 w-full mb-3" />
        <Skeleton className="h-4 w-5/6 mb-3" />
        <div className="mb-3 flex flex-wrap gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="border-t p-4">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
