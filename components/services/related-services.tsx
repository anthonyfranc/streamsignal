import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { StreamingService } from "@/types/streaming"

interface RelatedServicesProps {
  services: StreamingService[]
  currentServiceId: number
}

export function RelatedServices({ services = [], currentServiceId }: RelatedServicesProps) {
  // Return null if services is undefined or empty
  if (!services || services.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold mb-4">Similar Services</h3>
      <div className="space-y-4">
        {services.map((service) => (
          <Link
            key={service.id}
            href={`/services/${service.id}`}
            className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
              {service.logo_url ? (
                <img
                  src={service.logo_url || "/placeholder.svg"}
                  alt={service.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold">{service.name.substring(0, 2)}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium">{service.name}</div>
              <div className="text-xs text-gray-500">${service.monthly_price.toFixed(2)}/mo</div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  )
}
