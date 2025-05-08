"use server"

import { supabaseServer } from "@/lib/supabase"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

export async function getStreamingServices(): Promise<StreamingService[]> {
  const { data, error } = await supabaseServer
    .from("streaming_services")
    .select("*")
    .order("monthly_price", { ascending: false })

  if (error) {
    console.error("Error fetching streaming services:", error)
    return []
  }

  return data || []
}

export async function getChannels(): Promise<Channel[]> {
  const { data, error } = await supabaseServer.from("channels").select("*").order("popularity", { ascending: false })

  if (error) {
    console.error("Error fetching channels:", error)
    return []
  }

  return data || []
}

export async function getServiceChannels(): Promise<ServiceChannel[]> {
  const { data, error } = await supabaseServer.from("service_channels").select("*")

  if (error) {
    console.error("Error fetching service channels:", error)
    return []
  }

  return data || []
}

export async function getServicesWithChannelCount(): Promise<StreamingService[]> {
  // Get all services
  const services = await getStreamingServices()

  // Get the channel counts for each service
  const { data: channelCounts, error } = await supabaseServer
    .from("service_channels")
    .select("service_id, count")
    .select("service_id, count(*)", { count: "exact" })
    .group("service_id")

  if (error) {
    console.error("Error fetching channel counts:", error)
    return services
  }

  // Map the counts to the services
  return services.map((service) => {
    const countObj = channelCounts.find((c) => c.service_id === service.id)
    return {
      ...service,
      channel_count: countObj ? Number.parseInt(countObj.count) : 0,
    }
  })
}

export async function getServiceById(id: number): Promise<StreamingService | null> {
  const { data, error } = await supabaseServer.from("streaming_services").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching streaming service:", error)
    return null
  }

  return data
}

export async function getServiceChannelsById(serviceId: number): Promise<{ channels: Channel[] }> {
  const { data, error } = await supabaseServer
    .from("service_channels")
    .select("channel_id, tier")
    .eq("service_id", serviceId)

  if (error) {
    console.error("Error fetching service channels:", error)
    return { channels: [] }
  }

  if (data.length === 0) {
    return { channels: [] }
  }

  const channelIds = data.map((sc) => sc.channel_id)

  const { data: channels, error: channelsError } = await supabaseServer
    .from("channels")
    .select("*")
    .in("id", channelIds)
    .order("popularity", { ascending: false })

  if (channelsError) {
    console.error("Error fetching channels:", channelsError)
    return { channels: [] }
  }

  // Add tier information to each channel
  const channelsWithTier = channels.map((channel) => {
    const serviceChannel = data.find((sc) => sc.channel_id === channel.id)
    return {
      ...channel,
      tier: serviceChannel?.tier || "standard",
    }
  })

  return { channels: channelsWithTier }
}

export async function getRelatedServices(serviceId: number): Promise<StreamingService[]> {
  // Get the current service's channels
  const { channels } = await getServiceChannelsById(serviceId)

  if (channels.length === 0) {
    // If no channels, return some default services
    const { data, error } = await supabaseServer.from("streaming_services").select("*").neq("id", serviceId).limit(3)

    return data || []
  }

  const channelIds = channels.map((channel) => channel.id)

  // Find services that have the most overlap with these channels
  const { data: serviceChannels, error } = await supabaseServer
    .from("service_channels")
    .select("service_id, channel_id")
    .in("channel_id", channelIds)
    .neq("service_id", serviceId)

  if (error || !serviceChannels.length) {
    console.error("Error fetching related services:", error)
    return []
  }

  // Count how many matching channels each service has
  const serviceCounts: Record<number, number> = {}
  serviceChannels.forEach((sc) => {
    if (!serviceCounts[sc.service_id]) {
      serviceCounts[sc.service_id] = 0
    }
    serviceCounts[sc.service_id]++
  })

  // Sort services by number of matching channels
  const sortedServiceIds = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => Number.parseInt(id))
    .slice(0, 3)

  if (sortedServiceIds.length === 0) {
    return []
  }

  // Fetch the service details
  const { data: relatedServices, error: servicesError } = await supabaseServer
    .from("streaming_services")
    .select("*")
    .in("id", sortedServiceIds)

  if (servicesError) {
    console.error("Error fetching related services details:", servicesError)
    return []
  }

  // Sort the services in the same order as sortedServiceIds
  return sortedServiceIds
    .map((id) => relatedServices.find((service) => service.id === id))
    .filter((service): service is StreamingService => service !== undefined)
}
