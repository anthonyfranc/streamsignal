"use client"

import Link from "next/link"
import type { ServiceWithDetails } from "@/app/actions/service-actions"
import { ArrowRight } from "lucide-react"
import { FallbackImage } from "@/components/ui/fallback-image"
import type { Channel } from "@/types/streaming"
import { DeviceCompatibility } from "./device-compatibility"
import { KeyFeatures } from "./key-features"
import { useEffect, useState } from "react"

interface ServiceListProps {
  services: ServiceWithDetails[]
  serviceChannels: Record<number, Channel[]>
  isLoading: Record<number, boolean>
}

export function ServiceList({ services, serviceChannels, isLoading }: ServiceListProps) {
  // Determine the number of channels to display based on screen width
  const [channelDisplayCount, setChannelDisplayCount] = useState(5)

  useEffect(() => {
    const handleResize = () => {
      // Adjust channel count based on screen width
      if (window.innerWidth >= 1280) {
        // xl
        setChannelDisplayCount(8)
      } else if (window.innerWidth >= 1024) {
        // lg
        setChannelDisplayCount(6)
      } else if (window.innerWidth >= 768) {
        // md
        setChannelDisplayCount(5)
      } else if (window.innerWidth >= 640) {
        // sm
        setChannelDisplayCount(4)
      } else {
        setChannelDisplayCount(3)
      }
    }

    // Set initial value
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="space-y-6">
      {services.map((service, index) => {
        // Add cache-busting parameter to image URL
        const logoUrl = service.logo_url
          ? `${service.logo_url}${service.logo_url.includes("?") ? "&" : "?"}v=${Date.now()}`
          : null

        // Get channels for this service
        const channels = serviceChannels[service.id] || []
        const loading = isLoading[service.id]

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
          <div
            key={service.id}
            className={`
              bg-white rounded-lg shadow-sm transition-all
              ${index !== services.length - 1 ? "mb-6" : ""}
            `}
          >
            <Link href={`/services/${service.id}`} className="block">
              <div className="flex flex-col sm:flex-row sm:items-start p-6 border rounded-lg hover:shadow-md transition-all hover:border-gray-300 cursor-pointer group">
                <div className="flex items-start gap-4 w-full">
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

                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold line-clamp-1" title={service.name}>
                          {service.name}
                        </h3>
                        <div className="text-sm text-gray-500 mt-1">
                          {service.channel_count > 0
                            ? `${service.channel_count} channels • $${service.monthly_price}/mo`
                            : `Streaming service • $${service.monthly_price}/mo`}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity md:block hidden" />
                    </div>

                    <p className="mt-2 text-sm text-gray-600 line-clamp-2" title={service.description}>
                      {service.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Device Compatibility:</h4>
                        <DeviceCompatibility
                          compatibility={service.device_compatibility || mockDeviceCompatibility}
                          variant="compact"
                        />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Features:</h4>
                        <KeyFeatures
                          features={service.key_features || mockKeyFeatures}
                          variant="compact"
                          maxFeatures={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
