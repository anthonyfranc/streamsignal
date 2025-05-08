import { getServiceById } from "@/app/actions/admin-actions"
import { getServiceTiers } from "@/app/actions/pricing-actions"
import { TierComparisonView } from "@/components/admin/pricing/tier-comparison-view"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface ServicePricingComparisonPageProps {
  params: {
    id: string
  }
}

export default async function ServicePricingComparisonPage({ params }: ServicePricingComparisonPageProps) {
  const serviceId = Number.parseInt(params.id)
  const service = await getServiceById(serviceId)

  if (!service) {
    notFound()
  }

  const tiers = await getServiceTiers(serviceId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Pricing Tier Comparison</h1>
        <Button variant="outline" asChild>
          <Link href={`/admin/services/${serviceId}/pricing`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pricing Tiers
          </Link>
        </Button>
      </div>

      <TierComparisonView serviceId={serviceId} tiers={tiers} />
    </div>
  )
}
