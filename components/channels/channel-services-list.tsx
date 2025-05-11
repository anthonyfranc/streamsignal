import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FallbackImage } from "@/components/ui/fallback-image"
import type { StreamingService } from "@/types/streaming"

interface ChannelServicesListProps {
  services: StreamingService[]
}

export function ChannelServicesList({ services }: ChannelServicesListProps) {
  if (!services || services.length === 0) {
    return <div className="text-sm text-gray-500 mt-1">Not available on any services</div>
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <TooltipProvider>
        {services.slice(0, 5).map((service) => (
          <Tooltip key={service.id}>
            <TooltipTrigger asChild>
              <div className="h-6 w-6 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden relative">
                {service.logo_url ? (
                  <FallbackImage
                    src={service.logo_url || "/placeholder.svg"}
                    alt={service.name}
                    fill
                    sizes="24px"
                    className="object-contain"
                    loading="lazy"
                    generateFallback={(name) => `/placeholder.svg?height=24&width=24&query=${encodeURIComponent(name)}`}
                  />
                ) : (
                  <span className="text-xs font-medium">{service.name.charAt(0)}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">{service.name}</p>
                <p className="text-xs text-gray-500">
                  ${service.monthly_price.toFixed(2)}/month
                  {service.tier && ` (${service.tier})`}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {services.length > 5 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                +{services.length - 5}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">Also available on:</p>
                <ul className="text-xs text-gray-500">
                  {services.slice(5).map((service) => (
                    <li key={service.id}>{service.name}</li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  )
}
