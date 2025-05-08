"use client"

import { VisualMappingEditor } from "@/components/admin/mappings/visual-mapping-editor"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

interface ClientWrapperProps {
  services: StreamingService[]
  channels: Channel[]
  initialMappings: {
    mapping: ServiceChannel
    service: StreamingService
    channel: Channel
  }[]
  createMappingAction: (mapping: ServiceChannel) => Promise<{ success: boolean; error?: string }>
  deleteMappingAction: (serviceId: number, channelId: number) => Promise<{ success: boolean; error?: string }>
  updateMappingAction: (
    serviceId: number,
    channelId: number,
    tier: string,
  ) => Promise<{ success: boolean; error?: string }>
  batchCreateMappingsAction: (
    mappings: ServiceChannel[],
  ) => Promise<{ success: boolean; created: number; skipped: number; error?: string }>
}

export function ClientWrapper({
  services,
  channels,
  initialMappings,
  createMappingAction,
  deleteMappingAction,
  updateMappingAction,
  batchCreateMappingsAction,
}: ClientWrapperProps) {
  return (
    <VisualMappingEditor
      services={services}
      channels={channels}
      initialMappings={initialMappings}
      createMappingAction={createMappingAction}
      deleteMappingAction={deleteMappingAction}
      updateMappingAction={updateMappingAction}
      batchCreateMappingsAction={batchCreateMappingsAction}
    />
  )
}
