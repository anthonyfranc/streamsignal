import { Check, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StreamingService } from "@/types/streaming"
import { getServiceTiers } from "@/app/actions/pricing-actions"
import { isPromotionActive, getEffectivePrice, getPromotionalSavings } from "@/types/pricing"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PricingPlansProps {
  service: StreamingService
}

export async function PricingPlans({ service }: PricingPlansProps) {
  // Fetch real pricing tiers for this service
  const tiers = await getServiceTiers(service.id)

  // If no tiers are defined, show a default pricing card
  if (tiers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6 text-center">
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((plan) => {
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
