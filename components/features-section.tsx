import { BookOpen, Tv, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ComparisonTool } from "./comparison-tool/comparison-tool"

export function FeaturesSection() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Key Features</h2>
            <p className="max-w-[900px] text-gray-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Everything you need to make informed streaming decisions
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl mt-12 mb-16">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Streaming Service Comparison</CardTitle>
              <CardDescription>Select your must-have channels and find the perfect streaming service</CardDescription>
            </CardHeader>
            <CardContent>
              <ComparisonTool />
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 pt-12">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <Tv className="h-6 w-6 mb-2" />
              <CardTitle>Channel Directory</CardTitle>
              <CardDescription>Comprehensive overview of channel listings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Browse our complete directory of channels and find out which streaming services offer your favorites.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <Users className="h-6 w-6 mb-2" />
              <CardTitle>Service Reviews</CardTitle>
              <CardDescription>In-depth reviews of streaming platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Read detailed, unbiased reviews of all major streaming services to help you make informed decisions.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <BookOpen className="h-6 w-6 mb-2" />
              <CardTitle>Streaming Guides</CardTitle>
              <CardDescription>Helpful how-to resources</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                Access our library of guides to get the most out of your streaming subscriptions and devices.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
