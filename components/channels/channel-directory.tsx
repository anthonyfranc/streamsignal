"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search, Grid, List, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChannelGrid } from "./channel-grid"
import { ChannelList } from "./channel-list"
import { ChannelFilters } from "./channel-filters"
import { searchChannels, getChannelCategories } from "@/app/actions/channel-actions"
import type { ChannelWithServices } from "@/app/actions/channel-actions"

interface ChannelDirectoryProps {
  initialChannels: ChannelWithServices[]
}

export function ChannelDirectory({ initialChannels }: ChannelDirectoryProps) {
  const [channels, setChannels] = useState<ChannelWithServices[]>(initialChannels)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"name" | "popularity" | "services">("name")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasServices, setHasServices] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadCategories() {
      const categoriesData = await getChannelCategories()
      setCategories(categoriesData)
    }

    loadCategories()
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery || selectedCategory !== "all" || hasServices !== null) {
        setIsLoading(true)
        const results = await searchChannels(searchQuery, selectedCategory)

        // Filter by has services if needed
        let filteredResults = results
        if (hasServices !== null) {
          filteredResults = results.filter((channel) =>
            hasServices ? channel.services.length > 0 : channel.services.length === 0,
          )
        }

        // Sort the results
        const sortedResults = sortChannels(filteredResults, sortBy)
        setChannels(sortedResults)
        setIsLoading(false)
      } else {
        // If no filters, sort the initial channels
        setChannels(sortChannels(initialChannels, sortBy))
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, selectedCategory, sortBy, hasServices, initialChannels])

  const sortChannels = (channelsToSort: ChannelWithServices[], sortType: string) => {
    switch (sortType) {
      case "name":
        return [...channelsToSort].sort((a, b) => a.name.localeCompare(b.name))
      case "popularity":
        return [...channelsToSort].sort((a, b) => b.popularity - a.popularity)
      case "services":
        return [...channelsToSort].sort((a, b) => b.services.length - a.services.length)
      default:
        return channelsToSort
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
  }

  const handleSortChange = (value: "name" | "popularity" | "services") => {
    setSortBy(value)
  }

  const handleViewModeChange = (value: "grid" | "list") => {
    setViewMode(value)
  }

  const handleHasServicesChange = (value: boolean | null) => {
    setHasServices(value)
  }

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setHasServices(null)
    setSortBy("name")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search channels..."
            className="pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={sortBy} onValueChange={handleSortChange as (value: string) => void}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="services">Most Services</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden md:flex">
            <Tabs defaultValue={viewMode} onValueChange={handleViewModeChange as (value: string) => void}>
              <TabsList className="grid w-[120px] grid-cols-2">
                <TabsTrigger value="grid" className="flex items-center gap-1">
                  <Grid className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:inline-block">Grid</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-1">
                  <List className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:inline-block">List</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="sr-only">Filters</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Filter channels by category and availability</SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <ChannelFilters
                  categories={categories}
                  selectedCategory={selectedCategory}
                  hasServices={hasServices}
                  onCategoryChange={handleCategoryChange}
                  onHasServicesChange={handleHasServicesChange}
                  onReset={resetFilters}
                  className="flex flex-col"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="hidden md:block">
          <ChannelFilters
            categories={categories}
            selectedCategory={selectedCategory}
            hasServices={hasServices}
            onCategoryChange={handleCategoryChange}
            onHasServicesChange={handleHasServicesChange}
            onReset={resetFilters}
          />
        </div>

        <div className="md:col-span-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">No channels found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
              {(searchQuery || selectedCategory !== "all" || hasServices !== null) && (
                <Button variant="outline" className="mt-4" onClick={resetFilters}>
                  Reset Filters
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <ChannelGrid channels={channels} />
          ) : (
            <ChannelList channels={channels} />
          )}
        </div>
      </div>
    </div>
  )
}
