import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ServiceTier } from "@/types/pricing"
import { isPromotionActive, getEffectivePrice } from "@/types/pricing"

interface TierComparisonProps {
  tiers: ServiceTier[]
}

export function TierComparison({ tiers }: TierComparisonProps) {
  if (!tiers || tiers.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-lg font-medium mb-2">No Pricing Tiers Available</h3>
        <p className="text-gray-500">This service doesn't have any pricing tiers defined for comparison.</p>
      </div>
    )
  }

  if (tiers.length === 1) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <h3 className="text-lg font-medium mb-2">Only One Pricing Tier Available</h3>
        <p className="text-gray-500">This service has only one pricing tier, so no comparison is available.</p>
      </div>
    )
  }

  // Sort tiers by price (lowest to highest)
  const sortedTiers = [...tiers].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b))

  // Extract all unique features from all tiers
  const allFeatures = new Set<string>()
  sortedTiers.forEach((tier) => {
    tier.features.forEach((feature) => allFeatures.add(feature))
  })

  return (
    <Tabs defaultValue="grid" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="grid">Grid View</TabsTrigger>
        <TabsTrigger value="list">List View</TabsTrigger>
      </TabsList>

      <TabsContent value="grid" className="w-full">
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
          {sortedTiers.map((tier) => {
            const isPromo = isPromotionActive(tier)
            const effectivePrice = getEffectivePrice(tier)

            return (
              <div
                key={tier.id}
                className={`rounded-lg border ${tier.is_popular ? "border-black shadow-md" : ""} bg-card p-6 relative ${
                  sortedTiers.length <= 2 ? "md:max-w-none" : ""
                }`}
              >
                {tier.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                {isPromo && (
                  <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs px-3 py-1 rounded-full">
                    {Math.round(((tier.price - effectivePrice) / tier.price) * 100)}% OFF
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    {isPromo && <span className="text-sm text-gray-500 line-through">${tier.price.toFixed(2)}</span>}
                    <span className={`text-2xl font-bold ${isPromo ? "text-green-600" : ""}`}>
                      ${effectivePrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500">/month</span>
                  </div>
                  {isPromo && tier.promo_description && (
                    <div className="mt-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-sm inline-block">
                      {tier.promo_description}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700 mb-4">{tier.description}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Video Quality</h4>
                    <p>{tier.video_quality}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Max Streams</h4>
                    <p>{tier.max_streams}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Advertisements</h4>
                    <p>{tier.has_ads ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Features</h4>
                    <ul className="space-y-1">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6">
                  <Button className="w-full" variant={tier.is_popular ? "default" : "outline"}>
                    Choose Plan
                  </Button>
                </div>
                <div className="mt-2 text-center">
                  <button className="text-xs text-gray-500 hover:underline">Plan details</button>
                </div>
              </div>
            )
          })}
        </div>
      </TabsContent>

      <TabsContent value="list">
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
                        {tier.is_popular && <Badge className="mt-1">Popular</Badge>}
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
      </TabsContent>
    </Tabs>
  )
}
