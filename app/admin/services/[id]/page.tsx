import { getServiceById } from "@/app/actions/admin-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit, DollarSign, Database } from "lucide-react"
import Image from "next/image"

interface ServiceDetailPageProps {
  params: {
    id: string
  }
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const serviceId = Number.parseInt(params.id)
  const service = await getServiceById(serviceId)

  if (!service) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{service.name}</h1>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href="/admin/services">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Services
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/services/edit/${serviceId}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Service
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
            <CardDescription>Information about this streaming service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              {service.logo_url && (
                <div className="w-16 h-16 relative flex-shrink-0 overflow-hidden rounded-md border">
                  <Image
                    src={service.logo_url || "/placeholder.svg"}
                    alt={service.name}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="text-sm text-muted-foreground">${service.monthly_price.toFixed(2)}/month</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm">{service.description}</p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Features</h4>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {service.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Max Streams:</span> {service.max_streams}
              </div>
              <div>
                <span className="font-medium">Has Ads:</span> {service.has_ads ? "Yes" : "No"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Management</CardTitle>
            <CardDescription>Manage pricing tiers for this service</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Create and manage multiple pricing tiers for this streaming service. Define features, benefits, and costs
              for each tier.
            </p>
            <Button asChild className="w-full">
              <Link href={`/admin/services/${serviceId}/pricing`}>
                <DollarSign className="mr-2 h-4 w-4" />
                Manage Pricing Tiers
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
            <CardDescription>Manage content categories and add-ons for this service</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Create and manage content categories, content items, and add-on services for this streaming platform.
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href={`/admin/services/${serviceId}/content`}>
                  <Database className="mr-2 h-4 w-4" />
                  Manage Content
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
