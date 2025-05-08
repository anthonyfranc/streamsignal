"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, AlertCircle, Puzzle, DollarSign } from "lucide-react"
import type { Channel } from "@/types/streaming"

interface BundleRecommendationsProps {
  bundles: any[]
  selectedChannels: number[]
  channels: Channel[]
  onBackToSelection: () => void
  onViewSingleServices: () => void
}

export function BundleRecommendations({
  bundles,
  selectedChannels,
  channels,
  onBackToSelection,
  onViewSingleServices,
}: BundleRecommendationsProps) {
  // Get channel map for quick lookups
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]))

  // Get channel names for unique channels
  const getUniqueChannelNames = (channelIds: number[]) => {
    return channelIds.map((id) => channelMap.get(id)?.name || `Channel ${id}`).sort()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBackToSelection}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Selection
          </Button>
          <Button variant="ghost" onClick={onViewSingleServices} className="ml-2">
            View Single Services
          </Button>
        </div>
        <Badge variant="outline" className="ml-auto">
          {selectedChannels.length} channels selected
        </Badge>
      </div>

      <div className="bg-muted p-4 rounded-lg mb-6">
        <h3 className="flex items-center text-lg font-medium mb-2">
          <Puzzle className="mr-2 h-5 w-5" />
          Service Bundle Recommendations
        </h3>
        <p className="text-sm text-muted-foreground">
          These bundles combine multiple services to give you the best channel coverage. We've analyzed thousands of
          combinations to find the optimal balance of coverage and cost.
        </p>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Bundle Recommendations</h3>
          <p className="text-muted-foreground mb-6">
            We couldn't find any service bundles that provide sufficient coverage for your selected channels.
          </p>
          <Button onClick={onBackToSelection}>Modify Your Selection</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {bundles.map((bundle, index) => {
            const coveragePercentage = Math.round(bundle.coveragePercentage * 100)
            const servicesCount = bundle.services.length

            return (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="bg-primary/10 px-6 py-3">
                  <h3 className="font-medium flex items-center">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">
                      {index + 1}
                    </span>
                    {servicesCount}-Service Bundle: {coveragePercentage}% Coverage
                    <Badge className="ml-auto" variant="secondary">
                      ${bundle.totalPrice.toFixed(2)}/mo
                    </Badge>
                  </h3>
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Channel Coverage</span>
                      <span className="text-sm">
                        {bundle.coveredChannelCount} of {selectedChannels.length} channels
                      </span>
                    </div>
                    <Progress value={coveragePercentage} className="h-2" />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    {bundle.services.map((service: any) => {
                      const uniqueChannels = bundle.uniqueChannels[service.id] || []
                      const hasUniqueChannels = uniqueChannels.length > 0

                      return (
                        <div key={service.id} className="flex flex-col border rounded-lg p-4">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="relative h-16 w-16 flex-shrink-0">
                              <Image
                                src={service.logo_url || "/placeholder.svg"}
                                alt={service.name}
                                fill
                                className="object-contain"
                                sizes="64px"
                              />
                            </div>
                            <div>
                              <h4 className="font-medium">{service.name}</h4>
                              <p className="text-sm font-semibold text-green-600">${service.monthly_price}/mo</p>
                            </div>
                          </div>

                          <div className="mt-auto">
                            {hasUniqueChannels ? (
                              <div>
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">
                                  Unique channels only on this service:
                                </h5>
                                <div className="flex flex-wrap gap-1">
                                  {getUniqueChannelNames(uniqueChannels)
                                    .slice(0, 3)
                                    .map((name) => (
                                      <Badge key={name} variant="outline" className="text-xs">
                                        {name}
                                      </Badge>
                                    ))}
                                  {uniqueChannels.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{uniqueChannels.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                Complements other services in this bundle
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium flex items-center mb-2">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      Why This Bundle
                    </h4>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                        <span>
                          Covers {coveragePercentage}% of your selected channels ({bundle.coveredChannelCount} of{" "}
                          {selectedChannels.length})
                        </span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                        <span>
                          Total monthly cost of ${bundle.totalPrice.toFixed(2)} for {servicesCount} services
                        </span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                        <span>Each service in this bundle provides unique channels not available in the others</span>
                      </li>
                      <li className="flex items-start">
                        <DollarSign className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                        <span>Value score: {(bundle.valueScore * 100).toFixed(1)} (coverage per dollar)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button>Compare Bundle</Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
