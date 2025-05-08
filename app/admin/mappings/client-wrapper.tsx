"use client"

import { useState } from "react"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"
import { MappingsFilter, type MappingsFilters } from "@/components/admin/mappings-filter"
import { MappingsTable } from "@/components/admin/mappings-table"

interface ClientWrapperProps {
  mappings: {
    mapping: ServiceChannel
    service: StreamingService
    channel: Channel
  }[]
  services: StreamingService[]
  channels: Channel[]
  categories: string[]
  deleteMappingAction: (serviceId: number, channelId: number) => Promise<{ success: boolean; error?: string }>
  updateMappingAction: (
    serviceId: number,
    channelId: number,
    tier: string,
  ) => Promise<{ success: boolean; error?: string }>
}

export function MappingsClientWrapper({
  mappings,
  services,
  channels,
  categories,
  deleteMappingAction,
  updateMappingAction,
}: ClientWrapperProps) {
  const [filters, setFilters] = useState<MappingsFilters>({ search: "" })

  const handleFilterChange = (newFilters: MappingsFilters) => {
    setFilters(newFilters)
  }

  return (
    <>
      <MappingsFilter
        services={services}
        channels={channels}
        categories={categories}
        onFilterChange={handleFilterChange}
      />
      <MappingsTable
        mappings={mappings}
        filters={filters}
        deleteMappingAction={deleteMappingAction}
        updateMappingTierAction={updateMappingAction}
      />
    </>
  )
}
