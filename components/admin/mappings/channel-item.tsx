"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Channel } from "@/types/streaming"

interface ChannelItemProps {
  channel: Channel
}

export function ChannelItem({ channel }: ChannelItemProps) {
  return (
    <Card className="hover:bg-accent transition-colors">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
          {channel.logo_url ? (
            <img
              src={channel.logo_url || "/placeholder.svg"}
              alt={channel.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium">{channel.name.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{channel.name}</div>
          <div className="text-xs text-muted-foreground">Popularity: {channel.popularity}/10</div>
        </div>
        <Badge variant="outline" className="ml-auto">
          {channel.category}
        </Badge>
      </CardContent>
    </Card>
  )
}
