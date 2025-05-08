import Link from "next/link"
import { ArrowRight, Tv, Play, Users, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Find Your Perfect Streaming Experience
              </h1>
              <p className="max-w-[600px] text-gray-700 md:text-xl">
                Compare services, discover content, and make informed choices about your entertainment subscriptions.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Button asChild size="lg" className="gap-1">
                <Link href="#get-started">
                  Compare Services
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-[350px] w-full overflow-hidden rounded-xl bg-gray-100 sm:h-[450px] lg:h-[450px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 p-8">
                  <div className="flex h-24 w-full items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                    <Tv className="h-10 w-10" />
                  </div>
                  <div className="flex h-24 w-full items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                    <Play className="h-10 w-10" />
                  </div>
                  <div className="flex h-24 w-full items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                    <Users className="h-10 w-10" />
                  </div>
                  <div className="flex h-24 w-full items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                    <Zap className="h-10 w-10" />
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
