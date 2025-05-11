"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Search, Save, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ServiceItem } from "./service-item"
import { ChannelItem } from "./channel-item"
import { DropZone } from "./drop-zone"
import { MappingList } from "./mapping-list"
import { BatchMappingDialog } from "./batch-mapping-dialog"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

interface VisualMappingEditorProps {
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

export function VisualMappingEditor({
  services,
  channels,
  initialMappings,
  createMappingAction,
  deleteMappingAction,
  updateMappingAction,
  batchCreateMappingsAction,
}: VisualMappingEditorProps) {
  const router = useRouter()
  const [serviceSearch, setServiceSearch] = useState("")
  const [channelSearch, setChannelSearch] = useState("")
  const [mappingsChanged, setMappingsChanged] = useState(false)
  const [selectedService, setSelectedService] = useState<StreamingService | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string>("standard")
  const [isSaving, setIsSaving] = useState(false)
  const [activeMappings, setActiveMappings] = useState<
    Map<
      string,
      {
        service: StreamingService
        channel: Channel
        tier: string
      }
    >
  >(new Map())

  // Initialize mappings from props
  useEffect(() => {
    const mappingsMap = new Map()
    initialMappings.forEach(({ mapping, service, channel }) => {
      const key = `${service.id}-${channel.id}`
      mappingsMap.set(key, {
        service,
        channel,
        tier: mapping.tier,
      })
    })
    setActiveMappings(mappingsMap)
  }, [initialMappings])

  // Create a map of existing mappings for quick lookup
  const existingMappingsMap = useMemo(() => {
    const map = new Map<string, boolean>()
    activeMappings.forEach((_, key) => {
      map.set(key, true)
    })
    return map
  }, [activeMappings])

  // Filter services and channels based on search
  const filteredServices = useMemo(() => {
    return services.filter((service) => service.name.toLowerCase().includes(serviceSearch.toLowerCase()))
  }, [services, serviceSearch])

  const filteredChannels = useMemo(() => {
    return channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
        channel.category.toLowerCase().includes(channelSearch.toLowerCase()),
    )
  }, [channels, channelSearch])

  // Handle dropping a service onto a channel
  const handleServiceDroppedOnChannel = (service: StreamingService, channel: Channel) => {
    const key = `${service.id}-${channel.id}`

    // Check if mapping already exists
    if (activeMappings.has(key)) {
      toast({
        title: "Mapping already exists",
        description: `${service.name} is already mapped to ${channel.name}`,
        variant: "destructive",
      })
      return
    }

    // For new mappings, show the tier dialog
    setSelectedService(service)
    setSelectedChannel(channel)
    setSelectedTier("standard") // Default to standard tier
    setTierDialogOpen(true)
  }

  // Create a new mapping with the selected tier
  const createNewMapping = async () => {
    if (!selectedService || !selectedChannel) return

    setIsSaving(true)
    try {
      const result = await createMappingAction({
        service_id: selectedService.id,
        channel_id: selectedChannel.id,
        tier: selectedTier,
      })

      if (result.success) {
        // Add to active mappings
        const key = `${selectedService.id}-${selectedChannel.id}`
        const newMappings = new Map(activeMappings)
        newMappings.set(key, {
          service: selectedService,
          channel: selectedChannel,
          tier: selectedTier,
        })

        setActiveMappings(newMappings)
        setMappingsChanged(true)

        toast({
          title: "Mapping created",
          description: `Successfully mapped ${selectedService.name} to ${selectedChannel.name}`,
        })
      } else {
        toast({
          title: "Error creating mapping",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create mapping",
        variant: "destructive",
      })
    } finally {
      setTierDialogOpen(false)
      setSelectedService(null)
      setSelectedChannel(null)
      setIsSaving(false)
    }
  }

  // Handle batch creation of mappings
  const handleBatchCreateMappings = async (mappings: ServiceChannel[]) => {
    setIsSaving(true)
    try {
      const result = await batchCreateMappingsAction(mappings)

      if (result.success) {
        // Update active mappings with the new ones
        const newMappingsMap = new Map(activeMappings)

        // Find the corresponding service and channel objects for each new mapping
        mappings.forEach((mapping) => {
          const service = services.find((s) => s.id === mapping.service_id)
          const channel = channels.find((c) => c.id === mapping.channel_id)

          if (service && channel) {
            const key = `${mapping.service_id}-${mapping.channel_id}`
            // Only add if it doesn't already exist
            if (!newMappingsMap.has(key)) {
              newMappingsMap.set(key, {
                service,
                channel,
                tier: mapping.tier,
              })
            }
          }
        })

        setActiveMappings(newMappingsMap)
        setMappingsChanged(true)

        toast({
          title: "Batch mappings created",
          description: `Successfully created ${result.created} new mappings${
            result.skipped > 0 ? ` (${result.skipped} skipped as they already exist)` : ""
          }`,
        })
      } else {
        toast({
          title: "Error creating batch mappings",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create batch mappings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete a mapping
  const handleDeleteMapping = async (serviceId: number, channelId: number) => {
    setIsSaving(true)
    try {
      const result = await deleteMappingAction(serviceId, channelId)

      if (result.success) {
        // Remove from active mappings
        const key = `${serviceId}-${channelId}`
        const newMappings = new Map(activeMappings)
        newMappings.delete(key)

        setActiveMappings(newMappings)
        setMappingsChanged(true)

        toast({
          title: "Mapping deleted",
          description: "Successfully removed mapping",
        })
      } else {
        toast({
          title: "Error deleting mapping",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete mapping",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Update a mapping's tier
  const handleUpdateTier = async (serviceId: number, channelId: number, newTier: string) => {
    setIsSaving(true)
    try {
      const result = await updateMappingAction(serviceId, channelId, newTier)

      if (result.success) {
        // Update in active mappings
        const key = `${serviceId}-${channelId}`
        const mapping = activeMappings.get(key)

        if (mapping) {
          const newMappings = new Map(activeMappings)
          newMappings.set(key, {
            ...mapping,
            tier: newTier,
          })

          setActiveMappings(newMappings)
          setMappingsChanged(true)

          toast({
            title: "Tier updated",
            description: `Successfully updated tier to ${newTier}`,
          })
        }
      } else {
        toast({
          title: "Error updating tier",
          description: result.error || "An unexpected error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tier",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Refresh the page to see all changes
  const refreshMappings = () => {
    router.refresh()
    setMappingsChanged(false)
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Visual Mapping Editor</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Batch Create
                </Button>
                {mappingsChanged && (
                  <Button onClick={refreshMappings}>
                    <Save className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Services Column */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    className="pl-8"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                  />
                </div>

                <Card className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Services</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px] px-4 pb-4">
                      {filteredServices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                          No services found
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredServices.map((service) => (
                            <ServiceItem key={service.id} service={service} />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Channels Column */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search channels..."
                    className="pl-8"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                  />
                </div>

                <Card className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Channels (Drop a service here)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px] px-4 pb-4">
                      {filteredChannels.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                          No channels found
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredChannels.map((channel) => (
                            <DropZone
                              key={channel.id}
                              onDrop={(item) => handleServiceDroppedOnChannel(item.service, channel)}
                            >
                              <ChannelItem channel={channel} />
                            </DropZone>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Mappings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Active Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <MappingList
              mappings={Array.from(activeMappings.entries()).map(([key, mapping]) => ({
                key,
                service: mapping.service,
                channel: mapping.channel,
                tier: mapping.tier,
              }))}
              onDelete={(serviceId, channelId) => handleDeleteMapping(serviceId, channelId)}
              onUpdateTier={(serviceId, channelId, tier) => handleUpdateTier(serviceId, channelId, tier)}
            />
          </CardContent>
        </Card>

        {/* Tier Selection Dialog */}
        <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Tier</DialogTitle>
              <DialogDescription>
                Choose the tier for mapping {selectedService?.name} to {selectedChannel?.name}
              </DialogDescription>
            </DialogHeader>

            <RadioGroup value={selectedTier} onValueChange={setSelectedTier} className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="standard" />
                <Label htmlFor="standard" className="cursor-pointer">
                  Standard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="premium" id="premium" />
                <Label htmlFor="premium" className="cursor-pointer">
                  Premium
                </Label>
              </div>
            </RadioGroup>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTierDialogOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={createNewMapping} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Mapping"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Mapping Dialog */}
        <BatchMappingDialog
          open={batchDialogOpen}
          onOpenChange={setBatchDialogOpen}
          services={services}
          channels={channels}
          existingMappings={existingMappingsMap}
          onCreateBatchMappings={handleBatchCreateMappings}
        />
      </div>
    </DndProvider>
  )
}
