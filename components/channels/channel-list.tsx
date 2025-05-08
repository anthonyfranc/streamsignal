import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChannelServicesList } from "./channel-services-list"
import { FallbackImage } from "@/components/ui/fallback-image"
import type { ChannelWithServices } from "@/app/actions/channel-actions"

interface ChannelListProps {
  channels: ChannelWithServices[]
}

export function ChannelList({ channels }: ChannelListProps) {
  return (
    <div className="space-y-3">
      {channels.map((channel) => {
        // Add cache-busting parameter to image URL
        const logoUrl = channel.logo_url
          ? `${channel.logo_url}${channel.logo_url.includes("?") ? "&" : "?"}v=${Date.now()}`
          : "/placeholder.svg"

        return (
          <div
            key={channel.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full flex items-center justify-center overflow-hidden p-1 border border-gray-100 relative">
                {channel.logo_url ? (
                  <FallbackImage
                    src={logoUrl}
                    alt={`${channel.name} logo`}
                    fill
                    sizes="48px"
                    className="object-contain"
                    loading="lazy"
                    unoptimized={true}
                    entityName={channel.name} // Pass the name instead of a function
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full bg-black text-white font-bold text-sm rounded-full">
                    {channel.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold">{channel.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {channel.category}
                  </Badge>
                  <span className="text-xs text-gray-600">Popularity: {channel.popularity}/100</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2 sm:mt-0">
              <div className="w-full sm:w-auto">
                <span className="text-sm font-medium block sm:hidden mb-1">Available on:</span>
                <ChannelServicesList services={channel.services} />
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                <Link href={`/channels/${channel.id}`}>View Details</Link>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
