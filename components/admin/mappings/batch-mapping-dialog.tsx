"use client"

import { useState, useMemo } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

interface BatchMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  services: StreamingService[]
  channels: Channel[]
  existingMappings: Map<string, boolean>
  onCreateBatchMappings: (mappings: ServiceChannel[]) => Promise<void>
}

export function BatchMappingDialog({
  open,
  onOpenChange,
  services,
  channels,
  existingMappings,
  onCreateBatchMappings,
}: BatchMappingDialogProps) {
  const [selectedServices, setSelectedServices] = useState<StreamingService[]>([])
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([])
  const [tier, setTier] = useState<string>("standard")
  const [servicesOpen, setServicesOpen] = useState(false)
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate potential mappings
  const potentialMappings = useMemo(() => {
    const mappings: {
      service: StreamingService
      channel: Channel
      exists: boolean
    }[] = []

    selectedServices.forEach((service) => {
      selectedChannels.forEach((channel) => {
        const key = `${service.id}-${channel.id}`
        mappings.push({
          service,
          channel,
          exists: existingMappings.has(key),
        })
      })
    })

    return mappings
  }, [selectedServices, selectedChannels, existingMappings])

  // Count new mappings that will be created
  const newMappingsCount = potentialMappings.filter((m) => !m.exists).length

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || selectedChannels.length === 0) return

    setIsSubmitting(true)

    try {
      // Create array of new mappings
      const mappingsToCreate: ServiceChannel[] = potentialMappings
        .filter((m) => !m.exists)
        .map((m) => ({
          service_id: m.service.id,
          channel_id: m.channel.id,
          tier,
        }))

      await onCreateBatchMappings(mappingsToCreate)

      // Reset selections
      setSelectedServices([])
      setSelectedChannels([])
      setTier("standard")
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating batch mappings:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleService = (service: StreamingService) => {
    setSelectedServices((current) =>
      current.some((s) => s.id === service.id) ? current.filter((s) => s.id !== service.id) : [...current, service],
    )
  }

  const toggleChannel = (channel: Channel) => {
    setSelectedChannels((current) =>
      current.some((c) => c.id === channel.id) ? current.filter((c) => c.id !== channel.id) : [...current, channel],
    )
  }

  const removeService = (serviceId: number) => {
    setSelectedServices((current) => current.filter((s) => s.id !== serviceId))
  }

  const removeChannel = (channelId: number) => {
    setSelectedChannels((current) => current.filter((c) => c.id !== channelId))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Multiple Mappings</DialogTitle>
          <DialogDescription>
            Select multiple services and channels to create mappings between them all at once.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Services Selection */}
          <div className="space-y-2">
            <Label htmlFor="services">Select Services</Label>
            <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={servicesOpen}
                  className="w-full justify-between"
                >
                  {selectedServices.length > 0
                    ? `${selectedServices.length} service${selectedServices.length > 1 ? "s" : ""} selected`
                    : "Select services..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search services..." />
                  <CommandList>
                    <CommandEmpty>No services found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {services.map((service) => (
                          <CommandItem key={service.id} value={service.name} onSelect={() => toggleService(service)}>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedServices.some((s) => s.id === service.id) ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                {service.logo_url ? (
                                  <img
                                    src={service.logo_url || "/placeholder.svg"}
                                    alt={service.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-medium">
                                    {service.name.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {service.name}
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedServices.length > 0 && (
              <ScrollArea className="h-[100px] border rounded-md p-2 mt-2">
                <div className="flex flex-wrap gap-2">
                  {selectedServices.map((service) => (
                    <Badge key={service.id} variant="secondary" className="flex items-center gap-1">
                      {service.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeService(service.id)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {service.name}</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Channels Selection */}
          <div className="space-y-2">
            <Label htmlFor="channels">Select Channels</Label>
            <Popover open={channelsOpen} onOpenChange={setChannelsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={channelsOpen}
                  className="w-full justify-between"
                >
                  {selectedChannels.length > 0
                    ? `${selectedChannels.length} channel${selectedChannels.length > 1 ? "s" : ""} selected`
                    : "Select channels..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search channels..." />
                  <CommandList>
                    <CommandEmpty>No channels found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {channels.map((channel) => (
                          <CommandItem key={channel.id} value={channel.name} onSelect={() => toggleChannel(channel)}>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedChannels.some((c) => c.id === channel.id) ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                {channel.logo_url ? (
                                  <img
                                    src={channel.logo_url || "/placeholder.svg"}
                                    alt={channel.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-medium">
                                    {channel.name.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {channel.name}
                              <Badge variant="outline" className="ml-auto">
                                {channel.category}
                              </Badge>
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedChannels.length > 0 && (
              <ScrollArea className="h-[100px] border rounded-md p-2 mt-2">
                <div className="flex flex-wrap gap-2">
                  {selectedChannels.map((channel) => (
                    <Badge key={channel.id} variant="secondary" className="flex items-center gap-1">
                      {channel.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeChannel(channel.id)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {channel.name}</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Tier Selection */}
          <div className="space-y-2">
            <Label>Select Tier for All Mappings</Label>
            <RadioGroup value={tier} onValueChange={setTier} className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="batch-standard" />
                <Label htmlFor="batch-standard" className="cursor-pointer">
                  Standard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="premium" id="batch-premium" />
                <Label htmlFor="batch-premium" className="cursor-pointer">
                  Premium
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview */}
          {potentialMappings.length > 0 && (
            <div className="space-y-2 border rounded-md p-3">
              <Label>Preview</Label>
              <div className="text-sm">
                <p>
                  This will create {newMappingsCount} new mapping{newMappingsCount !== 1 ? "s" : ""}.
                  {potentialMappings.length - newMappingsCount > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({potentialMappings.length - newMappingsCount} already exist and will be skipped)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || newMappingsCount === 0}>
            {isSubmitting ? "Creating..." : `Create ${newMappingsCount} Mapping${newMappingsCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
