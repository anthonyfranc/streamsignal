import type { Metadata } from "next"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { BenefitsSection } from "@/components/benefits-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { CtaSection } from "@/components/cta-section"

export const metadata: Metadata = {
  title: "StreamSignal - Find the Perfect Streaming Service",
  description:
    "Compare streaming services, discover content, and make informed choices about your entertainment subscriptions.",
  keywords: ["streaming", "comparison", "entertainment", "tv", "movies", "subscription"],
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <TestimonialsSection />
      <CtaSection />
    </>
  )
}
