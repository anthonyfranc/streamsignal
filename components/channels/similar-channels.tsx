import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FallbackImage } from "@/components/ui/fallback-image"
import type { ChannelWithServices } from "@/app/actions/channel-actions"

interface SimilarChannelsProps {
  channels: ChannelWithServices[]
  currentChannelId: number
}

export function SimilarChannels({ channels, currentChannelId }: SimilarChannelsProps) {
  if (channels.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Similar Channels</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {channels.map((channel) => {
            // Add cache-busting parameter to image URL
            const logoUrl = channel.logo_url
              ? `${channel.logo_url}${channel.logo_url.includes("?") ? "&" : "?"}v=${Date.now()}`
              : "/placeholder.svg"

            return (
              <Link
                key={channel.id}
                href={`/channels/${channel.id}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden p-1 border border-gray-100 relative">
                  {channel.logo_url ? (
                    <FallbackImage
                      src={logoUrl}
                      alt={channel.name}
                      fill
                      sizes="40px"
                      className="object-contain"
                      loading="lazy"
                      unoptimized={true}
                      entityName={channel.name} // Pass the name instead of a function
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full bg-black text-white font-bold text-xs rounded-full">
                      {channel.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{channel.name}</div>
                  <div className="text-xs text-gray-500">Popularity: {channel.popularity}/100</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
