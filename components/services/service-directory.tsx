"use client"

import { useState, useEffect, useCallback } from "react"
import { ServiceGrid } from "./service-grid"
import { ServiceList } from "./service-list"
import { ServiceFilters } from "./service-filters"
import { Button } from "@/components/ui/button"
import { LayoutGrid, List } from "lucide-react"
import type { ServiceWithDetails } from "@/app/actions/service-actions"
import type { Channel } from "@/types/streaming"
import { getChannelsForService } from "@/app/actions/channel-actions"

interface ServiceDirectoryProps {
  services: ServiceWithDetails[]
  devices?: string[]
}

export function ServiceDirectory({ services, devices = [] }: ServiceDirectoryProps) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [filteredServices, setFilteredServices] = useState<ServiceWithDetails[]>(services)
  const [serviceChannels, setServiceChannels] = useState<Record<number, Channel[]>>({})
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({})

  // Handle filtering
  const handleFilterChange = useCallback(
    (query: string, priceRange: [number, number] | null, selectedDevices: string[]) => {
      let filtered = [...services]

      // Filter by search query
      if (query) {
        const lowerQuery = query.toLowerCase()
        filtered = filtered.filter(
          (service) =>
            service.name.toLowerCase().includes(lowerQuery) ||
            (service.description && service.description.toLowerCase().includes(lowerQuery)),
        )
      }

      // Filter by price range
      if (priceRange) {
        filtered = filtered.filter(
          (service) => service.monthly_price >= priceRange[0] && service.monthly_price <= priceRange[1],
        )
      }

      // Filter by devices (multi-select)
      if (selectedDevices.length > 0) {
        filtered = filtered.filter((service) => {
          // If service has devices property and it's an array
          if (service.devices && Array.isArray(service.devices)) {
            // Check if any of the selected devices are in the service's devices
            return selectedDevices.some((device) => service.devices.includes(device))
          }
          return false
        })
      }

      setFilteredServices(filtered)
    },
    [services],
  )

  // Fetch channels for services
  useEffect(() => {
    const fetchChannelsForServices = async () => {
      const channelsMap: Record<number, Channel[]> = {}
      const loadingMap: Record<number, boolean> = {}

      for (const service of filteredServices) {
        if (!serviceChannels[service.id]) {
          loadingMap[service.id] = true
          setIsLoading((prev) => ({ ...prev, [service.id]: true }))

          try {
            const channels = await getChannelsForService(service.id)
            channelsMap[service.id] = channels
          } catch (error) {
            console.error(`Error fetching channels for service ${service.id}:`, error)
            channelsMap[service.id] = []
          } finally {
            loadingMap[service.id] = false
          }
        } else {
          // Use cached channels
          channelsMap[service.id] = serviceChannels[service.id]
          loadingMap[service.id] = false
        }
      }

      setServiceChannels((prev) => ({ ...prev, ...channelsMap }))
      setIsLoading((prev) => ({ ...prev, ...loadingMap }))
    }

    fetchChannelsForServices()
  }, [filteredServices])

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">View:</span>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid size={18} className="mr-1" />
            Grid
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <List size={18} className="mr-1" />
            List
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <ServiceFilters devices={devices} onFilterChange={handleFilterChange} />
          </div>
        </div>
        <div className="lg:col-span-3">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium">No services found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your filters to find what you're looking for.</p>
            </div>
          ) : view === "grid" ? (
            <ServiceGrid services={filteredServices} serviceChannels={serviceChannels} isLoading={isLoading} />
          ) : (
            <ServiceList services={filteredServices} serviceChannels={serviceChannels} isLoading={isLoading} />
          )}
        </div>
      </div>
    </div>
  )
}
