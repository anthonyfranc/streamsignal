import { getServiceById } from "@/app/actions/admin-actions"
import { ServiceTiersManager } from "@/components/admin/pricing/service-tiers-manager"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface ServicePricingPageProps {
  params: {
    id: string
  }
}

export default async function ServicePricingPage({ params }: ServicePricingPageProps) {
  const serviceId = Number.parseInt(params.id)
  const service = await getServiceById(serviceId)

  if (!service) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Pricing Tiers</h1>
        <Button variant="outline" asChild>
          <Link href={`/admin/services/${serviceId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Service
          </Link>
        </Button>
      </div>

      <ServiceTiersManager serviceId={serviceId} serviceName={service.name} />
    </div>
  )
}
