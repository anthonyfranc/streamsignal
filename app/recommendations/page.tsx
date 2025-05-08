import type { Metadata } from "next"
import { RecommendationTool } from "@/components/recommendations/recommendation-tool"

export const metadata: Metadata = {
  title: "StreamSignal - Get Personalized Streaming Recommendations",
  description:
    "Select your must-have channels and get personalized streaming service recommendations tailored to your viewing preferences.",
  keywords: ["streaming", "recommendations", "personalized", "tv", "channels", "subscription"],
}

export default function RecommendationsPage() {
  return (
    <div className="container py-8 px-4 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Find Your Perfect Streaming Service</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select the channels you can't live without, and we'll recommend the best streaming services for your needs.
          </p>
        </div>
        <RecommendationTool />
      </div>
    </div>
  )
}
