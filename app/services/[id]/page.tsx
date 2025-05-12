import React from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Check, Info, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { getServiceById, getServiceChannelsById, getRelatedServices } from "@/app/actions/streaming-actions"
import { getServiceTiers } from "@/app/actions/pricing-actions"
import { getContentCategoriesWithItemsByServiceId, getAddonServicesByParentId } from "@/app/actions/content-actions"
import { AdaptiveContentDisplay } from "@/components/services/adaptive-content-display"
import { ConsolidatedPricingView } from "@/components/services/consolidated-pricing-view"
import { ServiceReviews } from "@/components/services/service-reviews"
import { RelatedServices } from "@/components/services/related-services"
import { FallbackImage } from "@/components/ui/fallback-image"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { calculateServiceRatings } from "@/app/actions/rating-actions"
import { getCurrentUser } from "@/lib/auth-utils"
import { ServiceReviewsSkeleton } from "@/components/services/service-reviews-skeleton"

interface ServicePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const service = await getServiceById(Number.parseInt(params.id))

  if (!service) {
    return {
      title: "Service Not Found - StreamSignal",
      description: "The streaming service you're looking for could not be found.",
    }
  }

  return {
    title: `${service.name} - StreamSignal`,
    description: service.description,
  }
}

export default async function ServicePage({ params }: ServicePageProps) {
  const serviceId = Number.parseInt(params.id)
  const service = await getServiceById(serviceId)

  if (!service) {
    notFound()
  }

  // Get current user
  const user = await getCurrentUser()

  // Fetch data based on the service's content structure type
  const { channels } = await getServiceChannelsById(serviceId)
  const contentCategories = await getContentCategoriesWithItemsByServiceId(serviceId)
  const addonServices = await getAddonServicesByParentId(serviceId)
  const relatedServices = await getRelatedServices(serviceId)
  const tiers = await getServiceTiers(serviceId)

  // Calculate dynamic ratings
  const ratings = await calculateServiceRatings(serviceId)

  // Group channels by category
  const channelsByCategory: Record<string, typeof channels> = {}
  channels.forEach((channel) => {
    if (!channelsByCategory[channel.category]) {
      channelsByCategory[channel.category] = []
    }
    channelsByCategory[channel.category].push(channel)
  })

  // Determine the content tab label based on service type
  const getContentTabLabel = () => {
    switch (service.content_structure_type) {
      case "channels":
        return "Channels"
      case "categories":
        return "Content Library"
      case "add_ons":
        return "Add-ons"
      case "hybrid":
        return "Content & Channels"
      default:
        return "Content"
    }
  }

  // Check if we should show the content tab
  const shouldShowContentTab = () => {
    return (
      Object.keys(channelsByCategory).length > 0 ||
      contentCategories.length > 0 ||
      addonServices.length > 0 ||
      service.content_structure_type !== "channels"
    )
  }

  const contentTabLabel = getContentTabLabel()
  const showContentTab = shouldShowContentTab()

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <Link href="/#features" className="inline-flex items-center text-sm mb-8 hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to comparison
      </Link>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:gap-12">
        <div>
          <div className="flex items-start gap-4 mb-6">
            <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
              {service.logo_url ? (
                <FallbackImage
                  src={service.logo_url || "/placeholder.svg"}
                  alt={service.name}
                  className="h-full w-full object-cover"
                  width={64}
                  height={64}
                  entityName={service.name}
                />
              ) : (
                <span className="text-xl font-bold">{service.name.substring(0, 2)}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{service.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-4 w-4 ${star <= Math.round(ratings.overall) ? "text-black" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium">{ratings.overall.toFixed(1)}</span>
                <span className="text-sm text-gray-500">(324 reviews)</span>
              </div>
            </div>
          </div>

          <p className="text-lg mb-6">{service.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 bg-gray-50">
                ${service.monthly_price.toFixed(2)}/mo
              </Badge>
              <span className="text-sm text-gray-500">Starting price</span>
            </div>
            {service.content_structure_type === "channels" && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 bg-gray-50">
                  {channels.length} Channels
                </Badge>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 bg-gray-50">
                {service.max_streams} Streams
              </Badge>
              <span className="text-sm text-gray-500">Simultaneous</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 bg-gray-50">
                {service.has_ads ? "Has Ads" : "Ad-Free"}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="overview" className="mb-12">
            <TabsList className={`grid w-full ${showContentTab ? "grid-cols-4" : "grid-cols-3"}`}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {showContentTab && <TabsTrigger value="content">{contentTabLabel}</TabsTrigger>}
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6">
              <div className="space-y-8">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Key Features</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <div className="mt-0.5 rounded-full bg-green-50 p-1">
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                      <li className="flex items-start gap-2">
                        <div className="mt-0.5 rounded-full bg-green-50 p-1">
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </div>
                        <span>{service.max_streams} simultaneous streams</span>
                      </li>
                      <li className="flex items-start gap-2">
                        {service.has_ads ? (
                          <>
                            <div className="mt-0.5 rounded-full bg-red-50 p-1">
                              <X className="h-3.5 w-3.5 text-red-600" />
                            </div>
                            <span>Contains advertisements</span>
                          </>
                        ) : (
                          <>
                            <div className="mt-0.5 rounded-full bg-green-50 p-1">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span>Ad-free viewing experience</span>
                          </>
                        )}
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Ratings Breakdown</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">Content Library</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Quality and variety of available content</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <span className="text-sm font-medium">{ratings.content.toFixed(1)}/5</span>
                        </div>
                        <Progress value={ratings.content * 20} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">Value for Money</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Cost effectiveness compared to similar services</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <span className="text-sm font-medium">{ratings.value.toFixed(1)}/5</span>
                        </div>
                        <Progress value={ratings.value * 20} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">User Interface</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Ease of use and navigation experience</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <span className="text-sm font-medium">{ratings.interface.toFixed(1)}/5</span>
                        </div>
                        <Progress value={ratings.interface * 20} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">Reliability</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Stream quality and service uptime</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <span className="text-sm font-medium">{ratings.reliability.toFixed(1)}/5</span>
                        </div>
                        <Progress value={ratings.reliability * 20} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Pros & Cons</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium">Pros</h4>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <div className="mt-0.5 rounded-full bg-green-50 p-1">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span>Extensive content library</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="mt-0.5 rounded-full bg-green-50 p-1">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span>High-quality original programming</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="mt-0.5 rounded-full bg-green-50 p-1">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span>User-friendly interface</span>
                          </li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium">Cons</h4>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <div className="mt-0.5 rounded-full bg-red-50 p-1">
                              <X className="h-3.5 w-3.5 text-red-600" />
                            </div>
                            <span>Higher price point than some competitors</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="mt-0.5 rounded-full bg-red-50 p-1">
                              <X className="h-3.5 w-3.5 text-red-600" />
                            </div>
                            <span>Content library varies by region</span>
                          </li>
                          {service.has_ads && (
                            <li className="flex items-start gap-2">
                              <div className="mt-0.5 rounded-full bg-red-50 p-1">
                                <X className="h-3.5 w-3.5 text-red-600" />
                              </div>
                              <span>Contains advertisements</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {showContentTab && (
              <TabsContent value="content" className="pt-6">
                <AdaptiveContentDisplay
                  service={service}
                  channelsByCategory={channelsByCategory}
                  contentCategories={contentCategories}
                  addonServices={addonServices}
                />
              </TabsContent>
            )}

            <TabsContent value="pricing" className="pt-6">
              <ConsolidatedPricingView service={service} tiers={tiers} />
            </TabsContent>

            <TabsContent value="reviews" className="pt-6">
              {/* Reviews Section */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Reviews</h2>
                <React.Suspense fallback={<ServiceReviewsSkeleton />}>
                  <ServiceReviews serviceId={service.id} />
                </React.Suspense>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-8">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
              <h3 className="font-semibold">Start Streaming Today</h3>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Monthly subscription</span>
                  <span className="font-medium">${service.monthly_price.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Annual subscription</span>
                  <span className="font-medium">${(service.monthly_price * 12 * 0.9).toFixed(2)}/yr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Annual savings</span>
                  <span className="font-medium text-green-600">${(service.monthly_price * 12 * 0.1).toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Subscribe Now
                  </Button>
                </div>
                <div className="text-xs text-center text-gray-500">No long-term contracts. Cancel anytime.</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Device Compatibility</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-50 p-1">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm">Smart TVs</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-50 p-1">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm">Mobile Devices (iOS & Android)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-50 p-1">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm">Web Browsers</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-50 p-1">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm">Gaming Consoles</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-50 p-1">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm">Streaming Devices (Roku, Fire TV)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <RelatedServices services={relatedServices} currentServiceId={serviceId} />
        </div>
      </div>
    </div>
  )
}
