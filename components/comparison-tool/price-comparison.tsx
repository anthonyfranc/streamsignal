"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { StreamingService } from "@/types/streaming"

interface PriceComparisonProps {
  services: StreamingService[]
  selectedChannels: number[]
  setActiveTab: (tab: string) => void
}

export function PriceComparison({ services, selectedChannels, setActiveTab }: PriceComparisonProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "yearly">("monthly")

  // Sort services by price
  const sortedServices = [...services].sort((a, b) => a.monthly_price - b.monthly_price)

  // Calculate yearly price (with 10% discount)
  const getYearlyPrice = (monthlyPrice: number) => {
    return monthlyPrice * 12 * 0.9
  }

  // Find best match service (most selected channels)
  const bestMatchService = [...services].sort(
    (a, b) => (b.selected_channels_count || 0) - (a.selected_channels_count || 0),
  )[0]

  if (selectedChannels.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-4">No channels selected</h3>
        <p className="text-gray-600 mb-6">Select channels to compare pricing for relevant streaming services.</p>
        <Button onClick={() => setActiveTab("channels")}>Select Channels</Button>
      </div>
    )
  }

  const maxPrice = Math.max(...services.map((s) => s.monthly_price))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Price Comparison</h3>
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={selectedPeriod === "monthly" ? "default" : "outline"}
            className="rounded-none"
            onClick={() => setSelectedPeriod("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={selectedPeriod === "yearly" ? "default" : "outline"}
            className="rounded-none"
            onClick={() => setSelectedPeriod("yearly")}
          >
            Yearly (10% off)
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {sortedServices.map((service) => {
              const price =
                selectedPeriod === "monthly" ? service.monthly_price : getYearlyPrice(service.monthly_price) / 12

              const yearlyPrice = getYearlyPrice(service.monthly_price)
              const isBestMatch = service.id === bestMatchService?.id

              return (
                <div key={service.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
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
                      <span className="font-medium">{service.name}</span>
                      {isBestMatch && selectedChannels.length > 0 && (
                        <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">Best Match</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${price.toFixed(2)}/mo</div>
                      {selectedPeriod === "yearly" && (
                        <div className="text-xs text-gray-500">${yearlyPrice.toFixed(2)}/year</div>
                      )}
                    </div>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-gray-600">
                          {service.selected_channels_count || 0}/{selectedChannels.length} channels
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-black h-2 rounded-full"
                          style={{ width: `${(price / maxPrice) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => setActiveTab("services")}>
          Back to Comparison
        </Button>
        <Button>Get Started</Button>
      </div>
    </div>
  )
}
