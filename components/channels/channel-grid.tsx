import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChannelServicesList } from "./channel-services-list"
import { FallbackImage } from "@/components/ui/fallback-image"
import type { ChannelWithServices } from "@/app/actions/channel-actions"

interface ChannelGridProps {
  channels: ChannelWithServices[]
}

export function ChannelGrid({ channels }: ChannelGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {channels.map((channel) => {
        // Add cache-busting parameter to image URL
        const logoUrl = channel.logo_url
          ? `${channel.logo_url}${channel.logo_url.includes("?") ? "&" : "?"}v=${Date.now()}`
          : "/placeholder.svg"

        return (
          <Card key={channel.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
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
                  <Badge variant="outline" className="text-xs">
                    {channel.category}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Popularity:</span>{" "}
                  <span className="text-gray-600">{channel.popularity}/100</span>
                </div>

                <div>
                  <span className="text-sm font-medium">Available on:</span>
                  <ChannelServicesList services={channel.services} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 px-4 py-3">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/channels/${channel.id}`}>View Details</Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
