"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import type { ServiceWithDetails } from "@/app/actions/service-actions"
import { FallbackImage } from "@/components/ui/fallback-image"
import type { Channel } from "@/types/streaming"
import { DeviceCompatibility } from "./device-compatibility"
import { KeyFeatures } from "./key-features"

interface ServiceGridProps {
  services: ServiceWithDetails[]
  serviceChannels: Record<number, Channel[]>
  isLoading: Record<number, boolean>
}

export function ServiceGrid({ services, serviceChannels, isLoading }: ServiceGridProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          // Add cache-busting parameter to image URL
          const logoUrl = service.logo_url
            ? `${service.logo_url}${service.logo_url.includes("?") ? "&" : "?"}v=${Date.now()}`
            : null

          // Mock data for device compatibility and key features
          // In a real implementation, this would come from the database
          const mockDeviceCompatibility = {
            smart_tv: true,
            mobile: true,
            web: true,
            gaming_console: service.id % 2 === 0, // Just for variation
            streaming_device: service.id % 3 === 0, // Just for variation
          }

          const mockKeyFeatures = [
            service.has_4k ? "4K Ultra HD" : "HD Streaming",
            "Multiple profiles",
            service.id % 2 === 0 ? "Offline downloads" : "Live TV",
            "No ads", // This won't show due to maxFeatures=3
          ]

          return (
            <Link href={`/services/${service.id}`} key={service.id} className="block h-full">
              <Card className="h-full overflow-hidden border-gray-200 hover:shadow-md transition-all hover:border-gray-300 cursor-pointer flex flex-col">
                <CardContent className="p-6 flex flex-col flex-grow">
                  {/* Header section with logo and name */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 relative bg-white shrink-0">
                      {service.logo_url ? (
                        <FallbackImage
                          src={logoUrl}
                          alt={service.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                          loading="lazy"
                          unoptimized={true}
                          entityName={service.name}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-gray-100 text-gray-800 font-bold text-lg rounded-full">
                          {service.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold line-clamp-1" title={service.name}>
                        {service.name}
                      </h3>
                      <div className="text-sm text-gray-500 mt-1">
                        {service.channel_count > 0 ? `${service.channel_count} channels` : "Streaming service"}
                      </div>
                    </div>
                  </div>

                  {/* Description section with fixed height */}
                  <div className="mt-3 h-[60px]">
                    <p className="text-sm text-gray-600 line-clamp-2" title={service.description}>
                      {service.description}
                    </p>
                  </div>

                  {/* Price section */}
                  <div className="mt-2 mb-4">
                    <div className="text-green-600 font-bold text-lg">${service.monthly_price}/mo</div>
                  </div>

                  {/* Device compatibility section */}
                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-medium mb-2">Device Compatibility:</h4>
                    <DeviceCompatibility compatibility={service.device_compatibility || mockDeviceCompatibility} />
                  </div>

                  {/* Key features section */}
                  <div className="mt-4 pt-3 border-t">
                    <h4 className="text-sm font-medium mb-2">Key Features:</h4>
                    <KeyFeatures features={service.key_features || mockKeyFeatures} maxFeatures={3} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </>
  )
}
