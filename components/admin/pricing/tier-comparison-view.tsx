"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, X, ArrowLeftRight } from "lucide-react"
import { isPromotionActive, getEffectivePrice, getPromotionalSavings } from "@/types/pricing"
import type { ServiceTier } from "@/types/pricing"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TierComparisonViewProps {
  serviceId: number
  tiers: ServiceTier[]
}

export function TierComparisonView({ serviceId, tiers }: TierComparisonViewProps) {
  const [selectedTiers, setSelectedTiers] = useState<ServiceTier[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showPromotionalOnly, setShowPromotionalOnly] = useState(false)

  // Initialize with first 3 tiers or all if less than 3
  useEffect(() => {
    if (tiers.length > 0) {
      setSelectedTiers(tiers.slice(0, Math.min(3, tiers.length)))
    }
  }, [tiers])

  // Filter tiers based on promotional status if needed
  const filteredTiers = showPromotionalOnly ? tiers.filter((tier) => isPromotionActive(tier)) : tiers

  const handleTierSelection = (tier: ServiceTier) => {
    if (selectedTiers.some((t) => t.id === tier.id)) {
      setSelectedTiers(selectedTiers.filter((t) => t.id !== tier.id))
    } else {
      setSelectedTiers([...selectedTiers, tier])
    }
  }

  const handleSelectAll = () => {
    if (selectedTiers.length === filteredTiers.length) {
      setSelectedTiers([])
    } else {
      setSelectedTiers([...filteredTiers])
    }
  }

  // Get all unique feature names across selected tiers
  const allFeatures = selectedTiers.reduce((features, tier) => {
    tier.features.forEach((feature) => {
      if (!features.includes(feature)) {
        features.push(feature)
      }
    })
    return features
  }, [] as string[])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Pricing Tier Comparison</h2>
          <p className="text-muted-foreground">Compare different pricing tiers side by side</p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-promotional"
            checked={showPromotionalOnly}
            onCheckedChange={(checked) => setShowPromotionalOnly(!!checked)}
          />
          <Label htmlFor="show-promotional">Show promotional tiers only</Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          {selectedTiers.length === filteredTiers.length ? "Deselect All" : "Select All"}
        </Button>
        {filteredTiers.map((tier) => (
          <Button
            key={tier.id}
            variant={selectedTiers.some((t) => t.id === tier.id) ? "default" : "outline"}
            size="sm"
            onClick={() => handleTierSelection(tier)}
          >
            {tier.name}
          </Button>
        ))}
      </div>

      {selectedTiers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
            <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Select tiers above to compare them</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="w-full" orientation="horizontal">
          <div className="min-w-max">
            <div
              className="grid"
              style={{ gridTemplateColumns: `200px repeat(${selectedTiers.length}, minmax(200px, 1fr))` }}
            >
              {/* Header row */}
              <div className="p-4 font-medium">Feature</div>
              {selectedTiers.map((tier) => (
                <div key={tier.id} className="p-4 text-center border-l">
                  <div className="font-bold text-lg">{tier.name}</div>
                  {tier.is_popular && <Badge className="mt-1">Popular</Badge>}
                  <div className="mt-2">
                    {isPromotionActive(tier) ? (
                      <div>
                        <div className="line-through text-muted-foreground">${tier.price.toFixed(2)}</div>
                        <div className="text-xl font-bold text-green-600">${getEffectivePrice(tier).toFixed(2)}</div>
                        <div className="text-xs text-green-600">
                          Save {getPromotionalSavings(tier)?.percentage.toFixed(0)}%
                        </div>
                        {tier.promo_description && (
                          <div className="mt-1 text-xs bg-green-50 text-green-700 p-1 rounded">
                            {tier.promo_description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xl font-bold">${tier.price.toFixed(2)}</div>
                    )}
                    <div className="text-xs text-muted-foreground">per month</div>
                  </div>
                </div>
              ))}

              {/* Basic features */}
              <div className="p-4 font-medium bg-muted/30">Max Streams</div>
              {selectedTiers.map((tier) => (
                <div key={`${tier.id}-streams`} className="p-4 text-center border-l bg-muted/30">
                  {tier.max_streams}
                </div>
              ))}

              <div className="p-4 font-medium">Video Quality</div>
              {selectedTiers.map((tier) => (
                <div key={`${tier.id}-quality`} className="p-4 text-center border-l">
                  {tier.video_quality}
                </div>
              ))}

              <div className="p-4 font-medium bg-muted/30">Advertisements</div>
              {selectedTiers.map((tier) => (
                <div key={`${tier.id}-ads`} className="p-4 text-center border-l bg-muted/30">
                  {tier.has_ads ? (
                    <div className="flex justify-center">
                      <Check className="h-5 w-5 text-red-500" />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <X className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
              ))}

              {/* Features */}
              <div className="p-4 font-medium border-t">Features</div>
              {selectedTiers.map((tier) => (
                <div key={`${tier.id}-features-header`} className="p-4 text-center border-l border-t"></div>
              ))}

              {allFeatures.map((feature, index) => (
                <React.Fragment key={feature}>
                  <div className={`p-4 ${index % 2 === 0 ? "bg-muted/30" : ""}`}>{feature}</div>
                  {selectedTiers.map((tier) => (
                    <div
                      key={`${tier.id}-${feature}`}
                      className={`p-4 text-center border-l ${index % 2 === 0 ? "bg-muted/30" : ""}`}
                    >
                      {tier.features.includes(feature) ? (
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-green-500" />
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
