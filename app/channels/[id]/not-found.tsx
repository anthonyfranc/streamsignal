import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ChannelNotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">Channel Not Found</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        The channel you're looking for could not be found. It may have been removed or the URL might be incorrect.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild>
          <Link href="/channels">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Channel Directory
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    </div>
  )
}
