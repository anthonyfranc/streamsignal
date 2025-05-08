"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStreamingServices, getChannels, getServiceChannels } from "@/app/actions/streaming-actions"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"
import { ChannelList } from "./channel-list"
import { ServiceComparison } from "./service-comparison"
import { PriceComparison } from "./price-comparison"

export function ComparisonTool() {
  const [services, setServices] = useState<StreamingService[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [serviceChannels, setServiceChannels] = useState<ServiceChannel[]>([])
  const [selectedChannels, setSelectedChannels] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("channels")

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [servicesData, channelsData, serviceChannelsData] = await Promise.all([
          getStreamingServices(),
          getChannels(),
          getServiceChannels(),
        ])

        setServices(servicesData)
        setChannels(channelsData)
        setServiceChannels(serviceChannelsData)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Update services with selected channel counts
  useEffect(() => {
    if (selectedChannels.length === 0) {
      // Reset selected_channels_count if no channels are selected
      setServices((prevServices) =>
        prevServices.map((service) => ({
          ...service,
          selected_channels_count: 0,
        })),
      )
      return
    }

    // For each service, count how many of the selected channels it has
    const updatedServices = services.map((service) => {
      const serviceChannelIds = serviceChannels.filter((sc) => sc.service_id === service.id).map((sc) => sc.channel_id)

      const matchCount = selectedChannels.filter((id) => serviceChannelIds.includes(id)).length

      return {
        ...service,
        selected_channels_count: matchCount,
      }
    })

    setServices(updatedServices)
  }, [selectedChannels, serviceChannels])

  const toggleChannel = (channelId: number) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId)
      } else {
        return [...prev, channelId]
      }
    })
  }

  const clearSelection = () => {
    setSelectedChannels([])
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="channels" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="channels">Select Channels</TabsTrigger>
          <TabsTrigger value="services">Compare Services</TabsTrigger>
          <TabsTrigger value="price">Price Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <ChannelList
            channels={channels}
            selectedChannels={selectedChannels}
            toggleChannel={toggleChannel}
            clearSelection={clearSelection}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServiceComparison
            services={services}
            channels={channels}
            serviceChannels={serviceChannels}
            selectedChannels={selectedChannels}
            setActiveTab={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="price">
          <PriceComparison services={services} selectedChannels={selectedChannels} setActiveTab={setActiveTab} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
