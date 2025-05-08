import { CheckCircle } from "lucide-react"

export function BenefitsSection() {
  return (
    <section id="benefits" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Why Choose StreamSignal?</h2>
              <p className="max-w-[600px] text-gray-700 md:text-xl">
                We help you navigate the complex world of streaming services to find the perfect match for your
                entertainment needs.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-black" />
                <div>
                  <h3 className="font-bold">Save Money</h3>
                  <p className="text-gray-700">
                    Find the most cost-effective combination of services for your viewing preferences.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-black" />
                <div>
                  <h3 className="font-bold">Discover Content</h3>
                  <p className="text-gray-700">
                    Uncover new shows and movies that match your interests across all platforms.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-black" />
                <div>
                  <h3 className="font-bold">Simplify Choices</h3>
                  <p className="text-gray-700">
                    Cut through the confusion with clear, data-driven comparisons and recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-[350px] w-full overflow-hidden rounded-xl bg-gray-100 sm:h-[450px] lg:h-[450px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="space-y-4 p-8">
                  <div className="h-16 w-full rounded-lg bg-white p-4 shadow-sm">
                    <div className="h-2 w-3/4 rounded-full bg-gray-200"></div>
                    <div className="mt-2 h-2 w-1/2 rounded-full bg-gray-200"></div>
                  </div>
                  <div className="h-16 w-full rounded-lg bg-white p-4 shadow-sm">
                    <div className="h-2 w-3/4 rounded-full bg-gray-200"></div>
                    <div className="mt-2 h-2 w-1/2 rounded-full bg-gray-200"></div>
                  </div>
                  <div className="h-16 w-full rounded-lg bg-white p-4 shadow-sm">
                    <div className="h-2 w-3/4 rounded-full bg-gray-200"></div>
                    <div className="mt-2 h-2 w-1/2 rounded-full bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
