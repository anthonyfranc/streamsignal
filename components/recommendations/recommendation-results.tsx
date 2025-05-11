"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, AlertCircle, DollarSign, Tv, Users, Puzzle } from "lucide-react"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

interface RecommendationResultsProps {
  recommendations: StreamingService[]
  selectedChannels: number[]
  channels: Channel[]
  serviceChannels: ServiceChannel[]
  onBackToSelection: () => void
  onViewBundles: () => void
}

export function RecommendationResults({
  recommendations,
  selectedChannels,
  channels,
  serviceChannels,
  onBackToSelection,
  onViewBundles,
}: RecommendationResultsProps) {
  // Get channel names for display
  const selectedChannelNames = channels
    .filter((channel) => selectedChannels.includes(channel.id))
    .map((channel) => channel.name)

  // Helper to get missing channels for a service
  const getMissingChannels = (serviceId: number) => {
    const serviceChannelIds = serviceChannels.filter((sc) => sc.service_id === serviceId).map((sc) => sc.channel_id)

    return channels
      .filter((channel) => selectedChannels.includes(channel.id) && !serviceChannelIds.includes(channel.id))
      .map((channel) => channel.name)
  }

  // Check if we have full coverage
  const hasFullCoverage =
    recommendations.length > 0 && recommendations[0].selected_channels_count === selectedChannels.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBackToSelection}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Selection
        </Button>
        <Badge variant="outline" className="ml-auto">
          {selectedChannels.length} channels selected
        </Badge>
      </div>

      {!hasFullCoverage && (
        <div className="bg-muted p-4 rounded-lg mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Need more complete coverage?</h3>
              <p className="text-sm text-muted-foreground">
                No single service has all your channels. View our bundle recommendations.
              </p>
            </div>
            <Button onClick={onViewBundles} className="flex items-center">
              <Puzzle className="mr-2 h-4 w-4" />
              View Service Bundles
            </Button>
          </div>
        </div>
      )}

      {recommendations.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Matching Services</h3>
          <p className="text-muted-foreground mb-6">
            We couldn't find any streaming services that match your selected channels.
          </p>
          <Button onClick={onBackToSelection}>Modify Your Selection</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6">
            {recommendations.map((service, index) => {
              const coveragePercentage = Math.round(
                ((service.selected_channels_count || 0) / selectedChannels.length) * 100,
              )
              const missingChannels = getMissingChannels(service.id)

              return (
                <div key={service.id} className="border rounded-lg overflow-hidden">
                  {index === 0 && (
                    <div className="bg-primary text-primary-foreground px-4 py-1 text-sm font-medium">
                      Top Recommendation
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <div className="relative h-24 w-24 md:h-32 md:w-32">
                          <Image
                            src={service.logo_url || "/placeholder.svg"}
                            alt={service.name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 96px, 128px"
                          />
                        </div>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-start justify-between">
                            <h3 className="text-xl font-bold">{service.name}</h3>
                            <span className="font-bold text-green-600">${service.monthly_price}/mo</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Channel Coverage</span>
                              <span className="text-sm">{coveragePercentage}%</span>
                            </div>
                            <Progress value={coveragePercentage} className="h-2" />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center text-sm">
                              <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />${service.monthly_price}
                              /month
                            </div>
                            <div className="flex items-center text-sm">
                              <Tv className="h-4 w-4 mr-1 text-muted-foreground" />
                              {service.selected_channels_count} of {selectedChannels.length} channels
                            </div>
                            <div className="flex items-center text-sm">
                              <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                              {service.max_streams} simultaneous streams
                            </div>
                            {!service.has_ads && (
                              <Badge variant="outline" className="text-xs">
                                Ad-Free
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="pt-2">
                          <h4 className="text-sm font-medium mb-2">Why this service?</h4>
                          <ul className="text-sm space-y-1">
                            <li className="flex items-start">
                              <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                              <span>
                                Includes {service.selected_channels_count} of your {selectedChannels.length} selected
                                channels
                                {service.selected_channels_count === selectedChannels.length && " (100% coverage)"}
                              </span>
                            </li>
                            {service.features && service.features.length > 0 && (
                              <li className="flex items-start">
                                <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                                <span>{service.features[0]}</span>
                              </li>
                            )}
                            {!service.has_ads && (
                              <li className="flex items-start">
                                <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                                <span>Ad-free viewing experience</span>
                              </li>
                            )}
                          </ul>

                          {missingChannels.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-medium mb-1 text-amber-600">Missing channels:</h4>
                              <p className="text-xs text-muted-foreground">{missingChannels.join(", ")}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Link href={`/services/${service.id}`}>
                        <Button>View Service Details</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Your Selected Channels</h3>
            <div className="flex flex-wrap gap-2">
              {selectedChannelNames.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
