"use client"

import { useState } from "react"
import { Check, X, LayoutGrid, List, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { StreamingService } from "@/types/streaming"
import type { ServiceTier } from "@/types/pricing"
import { isPromotionActive, getEffectivePrice, getPromotionalSavings } from "@/types/pricing"

interface ConsolidatedPricingViewProps {
  service: StreamingService
  tiers: ServiceTier[]
}

export function ConsolidatedPricingView({ service, tiers }: ConsolidatedPricingViewProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")

  // If no tiers are defined, show a default pricing card
  if (tiers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6 text-center max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-2">{service.name} Subscription</h3>
          <div className="mb-4">
            <span className="text-2xl font-bold">${service.monthly_price.toFixed(2)}</span>
            <span className="text-sm text-gray-500">/month</span>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Access all content from {service.name} with our standard subscription plan.
          </p>
          <div className="space-y-2 mb-6 text-left">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Full content library</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{service.max_streams} simultaneous streams</span>
            </div>
            {!service.has_ads && (
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Ad-free viewing experience</span>
              </div>
            )}
          </div>
          <Button className="w-full">Subscribe Now</Button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Additional Information</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• All plans can be canceled at any time</li>
            <li>• Prices may vary by region</li>
            <li>• Some content may require additional purchases</li>
          </ul>
        </div>
      </div>
    )
  }

  // Sort tiers by price (lowest to highest)
  const sortedTiers = [...tiers].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b))

  // Extract all unique features from all tiers for the table view
  const allFeatures = new Set<string>()
  sortedTiers.forEach((tier) => {
    tier.features.forEach((feature) => allFeatures.add(feature))
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Pricing Plans</h2>
        {tiers.length > 1 && (
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "cards" | "table")}
          >
            <ToggleGroupItem value="cards" aria-label="View as cards">
              <LayoutGrid className="h-4 w-4 mr-2" />
              <span className="sr-only md:not-sr-only md:inline-block">Cards</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="View as table">
              <List className="h-4 w-4 mr-2" />
              <span className="sr-only md:not-sr-only md:inline-block">Compare</span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {viewMode === "cards" ? (
        <div
          className={`grid gap-6 ${
            sortedTiers.length === 1
              ? "md:grid-cols-1 max-w-md mx-auto"
              : sortedTiers.length === 2
                ? "md:grid-cols-2"
                : sortedTiers.length === 3
                  ? "md:grid-cols-3"
                  : sortedTiers.length === 4
                    ? "md:grid-cols-2 lg:grid-cols-4"
                    : "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
          {sortedTiers.map((plan) => {
            const isPromo = isPromotionActive(plan)
            const effectivePrice = getEffectivePrice(plan)
            const savings = isPromo ? getPromotionalSavings(plan) : null

            return (
              <div
                key={plan.id}
                className={`rounded-lg border ${
                  plan.is_popular ? "border-black shadow-lg" : ""
                } bg-card p-6 relative transition-all duration-300 hover:shadow-md`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                {isPromo && (
                  <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs px-3 py-1 rounded-full">
                    {savings ? `${Math.round(savings.percentage)}% OFF` : "SALE"}
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    {isPromo && <span className="text-sm text-gray-500 line-through">${plan.price.toFixed(2)}</span>}
                    <span className={`text-2xl font-bold ${isPromo ? "text-green-600" : ""}`}>
                      ${effectivePrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500">/month</span>
                  </div>
                  {plan.promo_description && isPromo && (
                    <div className="mt-1 text-xs bg-green-50 text-green-700 p-1 rounded inline-block">
                      {plan.promo_description}
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Button className="w-full" variant={plan.is_popular ? "default" : "outline"}>
                    Choose Plan
                  </Button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center text-xs text-gray-500 cursor-help">
                          <Info className="h-3 w-3 mr-1" />
                          Plan details
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-medium">Video Quality:</span> {plan.video_quality}
                          </div>
                          <div>
                            <span className="font-medium">Max Streams:</span> {plan.max_streams}
                          </div>
                          <div>
                            <span className="font-medium">Advertisements:</span> {plan.has_ads ? "Yes" : "No"}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] bg-white sticky left-0 z-10">Feature</TableHead>
                {sortedTiers.map((tier) => {
                  const isPromo = isPromotionActive(tier)
                  return (
                    <TableHead key={tier.id} className="text-center min-w-[150px]">
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{tier.name}</span>
                        <div className="flex items-center gap-1 mt-1">
                          {isPromo ? (
                            <>
                              <span className="text-xs line-through text-gray-500">${tier.price.toFixed(2)}</span>
                              <span className="text-green-600 font-medium">
                                ${getEffectivePrice(tier).toFixed(2)}/mo
                              </span>
                            </>
                          ) : (
                            <span>${tier.price.toFixed(2)}/mo</span>
                          )}
                        </div>
                        {tier.is_popular && (
                          <span className="mt-1 text-xs bg-black text-white px-2 py-0.5 rounded-full">Popular</span>
                        )}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium bg-white sticky left-0 z-10">Video Quality</TableCell>
                {sortedTiers.map((tier) => (
                  <TableCell key={tier.id} className="text-center">
                    {tier.video_quality}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium bg-white sticky left-0 z-10">Max Streams</TableCell>
                {sortedTiers.map((tier) => (
                  <TableCell key={tier.id} className="text-center">
                    {tier.max_streams}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium bg-white sticky left-0 z-10">Advertisements</TableCell>
                {sortedTiers.map((tier) => (
                  <TableCell key={tier.id} className="text-center">
                    {tier.has_ads ? (
                      <X className="mx-auto h-4 w-4 text-red-500" />
                    ) : (
                      <Check className="mx-auto h-4 w-4 text-green-600" />
                    )}
                  </TableCell>
                ))}
              </TableRow>

              {/* Features comparison */}
              {Array.from(allFeatures).map((feature, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium bg-white sticky left-0 z-10">{feature}</TableCell>
                  {sortedTiers.map((tier) => (
                    <TableCell key={tier.id} className="text-center">
                      {tier.features.includes(feature) ? (
                        <Check className="mx-auto h-4 w-4 text-green-600" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {/* Action row */}
              <TableRow>
                <TableCell className="font-medium bg-white sticky left-0 z-10"></TableCell>
                {sortedTiers.map((tier) => (
                  <TableCell key={tier.id} className="text-center">
                    <Button size="sm" variant={tier.is_popular ? "default" : "outline"}>
                      Choose
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Additional Information</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>• All plans can be canceled at any time</li>
          <li>• Prices may vary by region</li>
          <li>• Some content may require additional purchases</li>
          <li>• Annual subscriptions available with 10% discount</li>
        </ul>
      </div>
    </div>
  )
}
