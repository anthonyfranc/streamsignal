import { ChannelGrid } from "@/components/services/channel-grid"
import { ContentCategoriesGrid } from "@/components/services/content-categories-grid"
import { AddonServicesGrid } from "@/components/services/addon-services-grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info } from "lucide-react"
import type { Channel, ContentCategory, AddonService, StreamingService } from "@/types/streaming"

interface AdaptiveContentDisplayProps {
  service: StreamingService
  channelsByCategory: Record<string, Channel[]>
  contentCategories: ContentCategory[]
  addonServices: AddonService[]
}

export function AdaptiveContentDisplay({
  service,
  channelsByCategory,
  contentCategories,
  addonServices,
}: AdaptiveContentDisplayProps) {
  // Helper function to check if there's content to display
  const hasChannels = Object.keys(channelsByCategory).length > 0
  const hasCategories = contentCategories.length > 0
  const hasAddons = addonServices.length > 0

  // For hybrid services, we'll use tabs to organize different content types
  if (
    service.content_structure_type === "hybrid" &&
    ((hasChannels && hasCategories) || (hasChannels && hasAddons) || (hasCategories && hasAddons))
  ) {
    return (
      <Tabs defaultValue={hasChannels ? "channels" : hasCategories ? "categories" : "addons"} className="space-y-6">
        <TabsList className="w-full justify-start border-b pb-px">
          {hasChannels && <TabsTrigger value="channels">Channels</TabsTrigger>}
          {hasCategories && <TabsTrigger value="categories">Content Library</TabsTrigger>}
          {hasAddons && <TabsTrigger value="addons">Add-on Services</TabsTrigger>}
        </TabsList>

        {hasChannels && (
          <TabsContent value="channels" className="mt-6">
            <ChannelGrid channelsByCategory={channelsByCategory} />
          </TabsContent>
        )}

        {hasCategories && (
          <TabsContent value="categories" className="mt-6">
            <ContentCategoriesGrid categories={contentCategories} />
          </TabsContent>
        )}

        {hasAddons && (
          <TabsContent value="addons" className="mt-6">
            <AddonServicesGrid addonServices={addonServices} />
          </TabsContent>
        )}
      </Tabs>
    )
  }

  // For non-hybrid services, determine what to display based on the service's content structure type
  switch (service.content_structure_type) {
    case "channels":
      return <ChannelGrid channelsByCategory={channelsByCategory} />

    case "categories":
      return <ContentCategoriesGrid categories={contentCategories} />

    case "add_ons":
      return <AddonServicesGrid addonServices={addonServices} />

    default:
      // If we have content of any type, display it
      if (hasChannels) {
        return <ChannelGrid channelsByCategory={channelsByCategory} />
      } else if (hasCategories) {
        return <ContentCategoriesGrid categories={contentCategories} />
      } else if (hasAddons) {
        return <AddonServicesGrid addonServices={addonServices} />
      }

      // Fallback if no content is available
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-3">
            <Info className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">No Content Available</h3>
          <p className="max-w-md text-gray-500">
            This streaming service doesn't have any content available yet. Check back later for updates.
          </p>
        </div>
      )
  }
}
