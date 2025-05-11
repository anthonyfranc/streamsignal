"use client"

import type React from "react"

import { useState } from "react"
import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { StreamingService, Channel } from "@/types/streaming"

export interface MappingsFilters {
  search: string
  serviceId?: number
  channelId?: number
  category?: string
  tier?: string
}

interface MappingsFilterProps {
  services: StreamingService[]
  channels: Channel[]
  categories: string[]
  onFilterChange: (filters: MappingsFilters) => void
}

export function MappingsFilter({ services, channels, categories, onFilterChange }: MappingsFilterProps) {
  const [filters, setFilters] = useState<MappingsFilters>({ search: "" })
  const [isOpen, setIsOpen] = useState(false)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = { ...filters, search: e.target.value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleFilterChange = (key: keyof MappingsFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const newFilters = { search: "" }
    setFilters(newFilters)
    onFilterChange(newFilters)
    setIsOpen(false)
  }

  const activeFilterCount = Object.keys(filters).filter(
    (key) => key !== "search" && filters[key as keyof MappingsFilters] !== undefined,
  ).length

  return (
    <div className="flex flex-col gap-4 w-full mb-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by service or channel name..."
            className="pl-8"
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-1">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-full px-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Filter Mappings</h4>
                <p className="text-sm text-muted-foreground">
                  Narrow down mappings by service, channel, category or tier.
                </p>
              </div>
              <Separator />
              <div className="grid gap-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="service" className="text-sm font-medium col-span-1">
                    Service
                  </label>
                  <Select
                    value={filters.serviceId?.toString() || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("serviceId", value === "all" ? undefined : Number.parseInt(value))
                    }
                  >
                    <SelectTrigger id="service" className="col-span-3">
                      <SelectValue placeholder="Any service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any service</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="channel" className="text-sm font-medium col-span-1">
                    Channel
                  </label>
                  <Select
                    value={filters.channelId?.toString() || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("channelId", value === "all" ? undefined : Number.parseInt(value))
                    }
                  >
                    <SelectTrigger id="channel" className="col-span-3">
                      <SelectValue placeholder="Any channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any channel</SelectItem>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id.toString()}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="category" className="text-sm font-medium col-span-1">
                    Category
                  </label>
                  <Select
                    value={filters.category || "all"}
                    onValueChange={(value) => handleFilterChange("category", value === "all" ? undefined : value)}
                  >
                    <SelectTrigger id="category" className="col-span-3">
                      <SelectValue placeholder="Any category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="tier" className="text-sm font-medium col-span-1">
                    Tier
                  </label>
                  <Select
                    value={filters.tier || "all"}
                    onValueChange={(value) => handleFilterChange("tier", value === "all" ? undefined : value)}
                  >
                    <SelectTrigger id="tier" className="col-span-3">
                      <SelectValue placeholder="Any tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any tier</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                  <X className="mr-1 h-3 w-3" />
                  Clear filters
                </Button>
                <Button size="sm" onClick={() => setIsOpen(false)}>
                  Apply filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.serviceId !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Service: {services.find((s) => s.id === filters.serviceId)?.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleFilterChange("serviceId", undefined)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            </Badge>
          )}
          {filters.channelId !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Channel: {channels.find((c) => c.id === filters.channelId)?.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleFilterChange("channelId", undefined)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            </Badge>
          )}
          {filters.category !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category: {filters.category}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleFilterChange("category", undefined)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            </Badge>
          )}
          {filters.tier !== undefined && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Tier: {filters.tier.charAt(0).toUpperCase() + filters.tier.slice(1)}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleFilterChange("tier", undefined)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
