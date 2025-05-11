import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Info, Plus } from "lucide-react"
import type { AddonService } from "@/types/streaming"
import { FallbackImage } from "@/components/ui/fallback-image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface AddonServicesGridProps {
  addonServices: AddonService[]
}

export function AddonServicesGrid({ addonServices }: AddonServicesGridProps) {
  if (addonServices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-gray-400"
          >
            <path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a2.12 2.12 0 0 0-.05 3.69l12.22 6.93a2 2 0 0 0 1.94 0L21 12.51a2.12 2.12 0 0 0-.09-3.67Z" />
            <path d="m3.09 8.84 12.35-6.61a1.93 1.93 0 0 1 1.81 0l3.65 1.9a2.12 2.12 0 0 1 .1 3.69L8.73 14.75a2 2 0 0 1-1.94 0L3 12.51a2.12 2.12 0 0 1 .09-3.67Z" />
            <line x1="12" y1="22" x2="12" y2="13" />
            <path d="M20 13.5v3.37a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13.5" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold">No Add-ons Available</h3>
        <p className="max-w-md text-gray-500">
          This streaming service doesn't have any add-on services available at the moment. Check back later for updates.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="mb-2 text-2xl font-bold">Available Add-on Services</h3>
        <p className="text-gray-600">
          Enhance your streaming experience with these premium add-on services. Subscribe to access exclusive content.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {addonServices.map((addon) => (
          <Card key={addon.id} className="overflow-hidden transition-all hover:shadow-md">
            {addon.addon_service && (
              <>
                <CardHeader className="pb-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-gray-100">
                      {addon.addon_service.logo_url ? (
                        <FallbackImage
                          src={addon.addon_service.logo_url}
                          alt={addon.addon_service.name}
                          className="h-full w-full object-contain"
                          width={48}
                          height={48}
                          entityName={addon.addon_service.name}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white">
                          <span className="text-sm font-bold">{addon.addon_service.name.substring(0, 2)}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{addon.addon_service.name}</CardTitle>
                      <div className="mt-1">
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800">
                          +${addon.price_addition.toFixed(2)}/mo
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {addon.addon_service.description && (
                    <CardDescription className="line-clamp-2 text-sm">
                      {addon.addon_service.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pb-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Channels</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Number of channels or content offerings</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-medium">{addon.addon_service.channel_count || "N/A"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Max Streams</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Maximum simultaneous streams allowed</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-medium">{addon.addon_service.max_streams}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Ad-free</span>
                      {!addon.addon_service.has_ads ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-gray-500">Contains ads</span>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add to Subscription
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
