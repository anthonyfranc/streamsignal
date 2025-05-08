"use client"

import Link from "next/link"
import { Check, X, Info, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

interface ServiceComparisonProps {
  services: StreamingService[]
  channels: Channel[]
  serviceChannels: ServiceChannel[]
  selectedChannels: number[]
  setActiveTab: (tab: string) => void
}

export function ServiceComparison({
  services,
  channels,
  serviceChannels,
  selectedChannels,
  setActiveTab,
}: ServiceComparisonProps) {
  // Sort services by how many selected channels they have
  const sortedServices = [...services].sort((a, b) => {
    // First by selected channels count (descending)
    const countDiff = (b.selected_channels_count || 0) - (a.selected_channels_count || 0)
    if (countDiff !== 0) return countDiff

    // Then by price (ascending)
    return a.monthly_price - b.monthly_price
  })

  // Get channel details for selected channels
  const selectedChannelDetails = channels.filter((channel) => selectedChannels.includes(channel.id))

  // For each service, get which selected channels it has
  const serviceSelectedChannels = sortedServices.map((service) => {
    const serviceChannelIds = serviceChannels.filter((sc) => sc.service_id === service.id).map((sc) => sc.channel_id)

    return {
      serviceId: service.id,
      channels: selectedChannelDetails.filter((channel) => serviceChannelIds.includes(channel.id)),
    }
  })

  if (selectedChannels.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-4">No channels selected</h3>
        <p className="text-gray-600 mb-6">Select channels to see which streaming services offer them.</p>
        <Button onClick={() => setActiveTab("channels")}>Select Channels</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Best services for your selected channels</h3>
        <Button variant="outline" size="sm" onClick={() => setActiveTab("channels")}>
          Edit Selection
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedServices.map((service, index) => (
          <Card key={service.id} className={index < 3 ? "border-black" : ""}>
            {index < 3 && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded-full">
                {index === 0 ? "Best Match" : index === 1 ? "2nd Best" : "3rd Best"}
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>${service.monthly_price.toFixed(2)}/month</CardDescription>
                </div>
                <div className="h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                  {service.logo_url ? (
                    <img
                      src={service.logo_url || "/placeholder.svg"}
                      alt={service.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold">{service.name.substring(0, 2)}</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Channel Match</span>
                    <span className="text-sm font-bold">
                      {service.selected_channels_count || 0}/{selectedChannels.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-black h-2.5 rounded-full"
                      style={{
                        width: `${((service.selected_channels_count || 0) / selectedChannels.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Included Channels</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Info className="h-4 w-4" />
                            <span className="sr-only">Channel Info</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">From your selected channels</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {serviceSelectedChannels
                      .find((s) => s.serviceId === service.id)
                      ?.channels.map((channel) => (
                        <Badge key={channel.id} variant="outline" className="text-xs">
                          {channel.name}
                        </Badge>
                      ))}
                    {(service.selected_channels_count || 0) === 0 && (
                      <span className="text-xs text-gray-500 italic">None of your selected channels</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Features</span>
                  <ul className="space-y-1">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-xs">
                        <Check className="h-3 w-3 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    <li className="flex items-center text-xs">
                      <Check className="h-3 w-3 mr-2 flex-shrink-0" />
                      {service.max_streams} simultaneous streams
                    </li>
                    <li className="flex items-center text-xs">
                      {service.has_ads ? (
                        <>
                          <X className="h-3 w-3 mr-2 flex-shrink-0" />
                          Contains ads
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-2 flex-shrink-0" />
                          Ad-free
                        </>
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full">Subscribe</Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/services/${service.id}`} className="flex items-center justify-center gap-1">
                  View Details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={() => setActiveTab("price")}>Compare Pricing</Button>
      </div>
    </div>
  )
}
