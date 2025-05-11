import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">What Our Users Say</h2>
            <p className="max-w-[900px] text-gray-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Join thousands of satisfied users who have simplified their streaming decisions
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 pt-12">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Avatar" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">James Davis</h3>
                  <p className="text-sm text-gray-700">Cord-cutter</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                "StreamSignal helped me save over $50 a month by finding the perfect combination of services for my
                family's viewing habits."
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Avatar" />
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">Sarah Miller</h3>
                  <p className="text-sm text-gray-700">Sports fan</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                "I was struggling to find a streaming service that had all my favorite sports channels. StreamSignal
                made it easy to compare and find the perfect match."
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Avatar" />
                  <AvatarFallback>RJ</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">Robert Johnson</h3>
                  <p className="text-sm text-gray-700">Movie buff</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                "The channel directory and service comparison tools are game-changers. I finally know exactly where to
                find all my favorite content."
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-12 flex justify-center">
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <div className="flex h-12 w-32 items-center justify-center rounded-lg bg-gray-100 p-2">
              <span className="text-sm font-bold">TechCrunch</span>
            </div>
            <div className="flex h-12 w-32 items-center justify-center rounded-lg bg-gray-100 p-2">
              <span className="text-sm font-bold">Wired</span>
            </div>
            <div className="flex h-12 w-32 items-center justify-center rounded-lg bg-gray-100 p-2">
              <span className="text-sm font-bold">Forbes</span>
            </div>
            <div className="flex h-12 w-32 items-center justify-center rounded-lg bg-gray-100 p-2">
              <span className="text-sm font-bold">CNET</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
