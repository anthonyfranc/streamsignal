"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import type { Channel } from "@/types/streaming"

interface ChannelListProps {
  channels: Channel[]
  selectedChannels: number[]
  toggleChannel: (channelId: number) => void
  clearSelection: () => void
}

export function ChannelList({ channels, selectedChannels, toggleChannel, clearSelection }: ChannelListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Get unique categories
  const categories = Array.from(new Set(channels.map((channel) => channel.category)))

  // Filter channels based on search and category
  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter ? channel.category === categoryFilter : true
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={categoryFilter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setCategoryFilter(null)}
          >
            All
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant={categoryFilter === category ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Select your must-have channels</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">{selectedChannels.length} selected</span>
          {selectedChannels.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearSelection} className="h-8 gap-1">
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              className={`flex items-center space-x-3 rounded-md border p-3 ${
                selectedChannels.includes(channel.id) ? "bg-gray-50 border-gray-400" : ""
              }`}
            >
              <Checkbox
                id={`channel-${channel.id}`}
                checked={selectedChannels.includes(channel.id)}
                onCheckedChange={() => toggleChannel(channel.id)}
              />
              <div className="flex flex-1 items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {channel.logo_url ? (
                    <img
                      src={channel.logo_url || "/placeholder.svg"}
                      alt={channel.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold">{channel.name.substring(0, 2)}</span>
                  )}
                </div>
                <label
                  htmlFor={`channel-${channel.id}`}
                  className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {channel.name}
                </label>
                <Badge variant="outline" className="text-xs">
                  {channel.category}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-end mt-6">
        <Button
          onClick={() => document.querySelector('[data-value="services"]')?.click()}
          disabled={selectedChannels.length === 0}
        >
          Compare Services
        </Button>
      </div>
    </div>
  )
}
