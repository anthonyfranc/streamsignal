"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Search, Check } from "lucide-react"
import type { Channel } from "@/types/streaming"

interface ChannelSelectorProps {
  channels: Channel[]
  selectedChannels: number[]
  toggleChannel: (channelId: number) => void
  clearSelection: () => void
}

export function ChannelSelector({ channels, selectedChannels, toggleChannel, clearSelection }: ChannelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(channels.map((channel) => channel.category)))].sort()

  // Filter channels based on search and category
  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === "all" || channel.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Sort channels: selected first, then by popularity
  const sortedChannels = [...filteredChannels].sort((a, b) => {
    const aSelected = selectedChannels.includes(a.id)
    const bSelected = selectedChannels.includes(b.id)

    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1

    return b.popularity - a.popularity
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search channels..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedChannels.length > 0 && (
            <Badge variant="secondary" className="h-9 px-3">
              {selectedChannels.length} selected
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={selectedChannels.length === 0}
            className="ml-auto sm:ml-0"
          >
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
        <ScrollArea className="w-full">
          <TabsList className="w-max mb-4 px-2">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <TabsContent value={activeCategory} className="m-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sortedChannels.map((channel) => {
              const isSelected = selectedChannels.includes(channel.id)
              return (
                <button
                  key={channel.id}
                  onClick={() => toggleChannel(channel.id)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <div className="relative h-12 w-12 mb-2">
                    <Image
                      src={channel.logo_url || "/placeholder.svg"}
                      alt={channel.name}
                      fill
                      className="object-contain"
                      sizes="48px"
                    />
                  </div>
                  <span className="text-xs text-center line-clamp-2">{channel.name}</span>
                </button>
              )
            })}
          </div>

          {filteredChannels.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No channels found matching your search.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
