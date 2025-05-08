import { Badge } from "@/components/ui/badge"
import type { Channel } from "@/types/streaming"

interface ChannelGridProps {
  channelsByCategory: Record<string, Channel[]>
}

export function ChannelGrid({ channelsByCategory }: ChannelGridProps) {
  const categories = Object.keys(channelsByCategory).sort()

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No channels available for this service.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {channelsByCategory[category].map((channel) => (
              <div
                key={channel.id}
                className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-2">
                  {channel.logo_url ? (
                    <img
                      src={channel.logo_url || "/placeholder.svg"}
                      alt={channel.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold">{channel.name.substring(0, 2)}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-center">{channel.name}</span>
                {channel.tier === "premium" && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Premium
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
