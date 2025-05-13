"use server"

import { createClient } from "@/lib/supabase-server"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

export interface AdminStats {
  servicesCount: number
  servicesChange: number
  channelsCount: number
  channelsChange: number
  usersCount: number
  usersChange: number
  mappingsCount: number
  mappingsChange: number
  overviewData: {
    name: string
    total: number
  }[]
  recentActivities: {
    id: number
    action: string
    entity: string
    entityId: number
    entityName: string
    timestamp: string
    user: string
  }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  // In a real application, you would fetch this data from your database
  // For this example, we'll use mock data

  // Get actual counts from the database
  const supabase = await createClient()
  const { data: services, error: servicesError } = await supabase.from("streaming_services").select("id")
  const { data: channels, error: channelsError } = await supabase.from("channels").select("id")
  const { data: mappings, error: mappingsError } = await supabase
    .from("service_channels")
    .select("service_id, channel_id")

  // Calculate counts
  const servicesCount = services?.length || 0
  const channelsCount = channels?.length || 0
  const mappingsCount = mappings?.length || 0

  // Mock data for changes and other stats
  return {
    servicesCount,
    servicesChange: 2,
    channelsCount,
    channelsChange: 5,
    usersCount: 1250,
    usersChange: 12,
    mappingsCount,
    mappingsChange: 8,
    overviewData: [
      { name: "Jan", total: 120 },
      { name: "Feb", total: 240 },
      { name: "Mar", total: 380 },
      { name: "Apr", total: 470 },
      { name: "May", total: 580 },
      { name: "Jun", total: 690 },
      { name: "Jul", total: 820 },
      { name: "Aug", total: 950 },
      { name: "Sep", total: 1100 },
      { name: "Oct", total: 1250 },
      { name: "Nov", total: 1380 },
      { name: "Dec", total: 1500 },
    ],
    recentActivities: [
      {
        id: 1,
        action: "created",
        entity: "service",
        entityId: 12,
        entityName: "New Streaming Service",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        user: "admin@example.com",
      },
      {
        id: 2,
        action: "updated",
        entity: "channel",
        entityId: 45,
        entityName: "Sports Channel",
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        user: "admin@example.com",
      },
      {
        id: 3,
        action: "deleted",
        entity: "mapping",
        entityId: 78,
        entityName: "Service-Channel Mapping",
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        user: "admin@example.com",
      },
      {
        id: 4,
        action: "created",
        entity: "channel",
        entityId: 46,
        entityName: "News Channel",
        timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
        user: "admin@example.com",
      },
      {
        id: 5,
        action: "updated",
        entity: "service",
        entityId: 8,
        entityName: "Existing Service",
        timestamp: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
        user: "admin@example.com",
      },
    ],
  }
}

// Helper function to resolve logo_url
async function resolveLogoUrl(logoUrl: string): Promise<string> {
  console.log("Resolving logo URL:", logoUrl)

  // If it's a numeric ID, fetch the media asset URL
  if (/^\d+$/.test(logoUrl)) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from("media_assets")
        .select("url")
        .eq("id", Number.parseInt(logoUrl, 10))
        .single()

      if (error) {
        console.error("Error fetching media asset:", error)
        return logoUrl
      }

      if (data && data.url) {
        console.log("Resolved media asset URL:", data.url)
        return data.url
      }
    } catch (error) {
      console.error("Exception resolving media asset URL:", error)
    }
  }

  // If it's not a numeric ID or the media asset wasn't found, return the original value
  return logoUrl
}

// Update the createChannel function with better error handling
export async function createChannel(
  channel: Omit<Channel, "id" | "created_at">,
): Promise<{ success: boolean; id?: number; error?: string }> {
  console.log("Creating channel with data:", JSON.stringify(channel, null, 2))

  try {
    // Create a copy of the channel data to avoid modifying the original
    const channelData = { ...channel }

    // If logo_url is a numeric ID, resolve it to the actual URL
    if (channelData.logo_url && /^\d+$/.test(channelData.logo_url)) {
      channelData.logo_url = await resolveLogoUrl(channelData.logo_url)
    }

    console.log("Inserting channel with processed data:", JSON.stringify(channelData, null, 2))

    const supabase = await createClient()
    const { data, error } = await supabase.from("channels").insert([channelData]).select()

    if (error) {
      console.error("Supabase error creating channel:", error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      console.error("No data returned after channel creation")
      return { success: false, error: "No data returned from database" }
    }

    console.log("Channel created successfully:", data[0])
    return { success: true, id: data[0].id }
  } catch (error) {
    console.error("Exception creating channel:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Update the createService function with better error handling
export async function createService(
  service: Omit<StreamingService, "id" | "created_at">,
): Promise<{ success: boolean; id?: number; error?: string }> {
  console.log("Creating service with data:", JSON.stringify(service, null, 2))

  try {
    // Create a copy of the service data to avoid modifying the original
    const serviceData = { ...service }

    // If logo_url is a numeric ID, resolve it to the actual URL
    if (serviceData.logo_url && /^\d+$/.test(serviceData.logo_url)) {
      serviceData.logo_url = await resolveLogoUrl(serviceData.logo_url)
    }

    console.log("Inserting service with processed data:", JSON.stringify(serviceData, null, 2))

    const supabase = await createClient()
    const { data, error } = await supabase.from("streaming_services").insert([serviceData]).select()

    if (error) {
      console.error("Supabase error creating service:", error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      console.error("No data returned after service creation")
      return { success: false, error: "No data returned from database" }
    }

    console.log("Service created successfully:", data[0])
    return { success: true, id: data[0].id }
  } catch (error) {
    console.error("Exception creating service:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function getServices(): Promise<StreamingService[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("streaming_services").select("*").order("name")

  if (error) {
    console.error("Error fetching services:", error)
    return []
  }

  return data || []
}

export async function getServiceById(id: number): Promise<StreamingService | null> {
  console.log(`[Admin Action] Fetching service with ID: ${id}`)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("streaming_services").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching service:", error)
      return null
    }

    console.log(`[Admin Action] Successfully fetched service:`, data)
    return data
  } catch (error) {
    console.error("Exception fetching service:", error)
    return null
  }
}

export async function updateService(
  id: number,
  service: Partial<StreamingService>,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Updating service with data:", JSON.stringify(service, null, 2))

    // Create a copy of the service data to avoid modifying the original
    const serviceData = { ...service }

    // If logo_url is a numeric ID, resolve it to the actual URL
    if (serviceData.logo_url && /^\d+$/.test(serviceData.logo_url)) {
      console.log("Detected numeric logo_url, resolving to actual URL:", serviceData.logo_url)
      serviceData.logo_url = await resolveLogoUrl(serviceData.logo_url)
      console.log("Resolved logo_url:", serviceData.logo_url)
    }

    console.log("Updating service with processed data:", JSON.stringify(serviceData, null, 2))

    const supabase = await createClient()
    const { error } = await supabase.from("streaming_services").update(serviceData).eq("id", id)

    if (error) {
      console.error("Error updating service:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception updating service:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function deleteService(id: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  // First, delete any service-channel mappings
  const { error: mappingError } = await supabase.from("service_channels").delete().eq("service_id", id)

  if (mappingError) {
    console.error("Error deleting service mappings:", mappingError)
    return { success: false, error: mappingError.message }
  }

  // Then delete the service
  const { error } = await supabase.from("streaming_services").delete().eq("id", id)

  if (error) {
    console.error("Error deleting service:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function bulkDeleteServices(
  ids: number[],
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  if (!ids.length) {
    return { success: false, error: "No services selected" }
  }

  try {
    const supabase = await createClient()
    // First, delete any service-channel mappings for these services
    const { error: mappingError } = await supabase.from("service_channels").delete().in("service_id", ids)

    if (mappingError) {
      console.error("Error deleting service mappings:", mappingError)
      return { success: false, error: mappingError.message }
    }

    // Then delete the services
    const { error, count } = await supabase.from("streaming_services").delete().in("id", ids).select("count")

    if (error) {
      console.error("Error bulk deleting services:", error)
      return { success: false, error: error.message }
    }

    return { success: true, deletedCount: count }
  } catch (error) {
    console.error("Unexpected error during bulk delete:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function bulkUpdateServices(
  ids: number[],
  updates: Partial<StreamingService>,
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  if (!ids.length) {
    return { success: false, error: "No services selected" }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No updates provided" }
  }

  try {
    // Create a copy of the updates to avoid modifying the original
    const updatesData = { ...updates }

    // If logo_url is a numeric ID, resolve it to the actual URL
    if (updatesData.logo_url && /^\d+$/.test(updatesData.logo_url)) {
      updatesData.logo_url = await resolveLogoUrl(updatesData.logo_url)
    }

    const supabase = await createClient()
    const { error, count } = await supabase.from("streaming_services").update(updatesData).in("id", ids).select("count")

    if (error) {
      console.error("Error bulk updating services:", error)
      return { success: false, error: error.message }
    }

    return { success: true, updatedCount: count }
  } catch (error) {
    console.error("Unexpected error during bulk update:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Channels CRUD operations
export async function getChannels(): Promise<Channel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("channels").select("*").order("name")

  if (error) {
    console.error("Error fetching channels:", error)
    return []
  }

  return data || []
}

export async function getChannelById(id: number): Promise<Channel | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("channels").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching channel:", error)
    return null
  }

  return data
}

// Update the updateChannel function to resolve the logo_url
export async function updateChannel(
  id: number,
  channel: Partial<Channel>,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a copy of the channel data to avoid modifying the original
    const channelData = { ...channel }

    // If logo_url is a numeric ID, resolve it to the actual URL
    if (channelData.logo_url && /^\d+$/.test(channelData.logo_url)) {
      console.log("Detected numeric logo_url, resolving to actual URL:", channelData.logo_url)
      channelData.logo_url = await resolveLogoUrl(channelData.logo_url)
      console.log("Resolved logo_url:", channelData.logo_url)
    }

    console.log("Updating channel with processed data:", JSON.stringify(channelData, null, 2))

    const supabase = await createClient()
    const { error } = await supabase.from("channels").update(channelData).eq("id", id)

    if (error) {
      console.error("Error updating channel:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating channel:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function deleteChannel(id: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  // First, delete any service-channel mappings
  const { error: mappingError } = await supabase.from("service_channels").delete().eq("channel_id", id)

  if (mappingError) {
    console.error("Error deleting channel mappings:", mappingError)
    return { success: false, error: mappingError.message }
  }

  // Then delete the channel
  const { error } = await supabase.from("channels").delete().eq("id", id)

  if (error) {
    console.error("Error deleting channel:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function bulkDeleteChannels(
  ids: number[],
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  if (!ids.length) {
    return { success: false, error: "No channels selected" }
  }

  try {
    const supabase = await createClient()
    // First, delete any service-channel mappings for these channels
    const { error: mappingError } = await supabase.from("service_channels").delete().in("channel_id", ids)

    if (mappingError) {
      console.error("Error deleting channel mappings:", mappingError)
      return { success: false, error: mappingError.message }
    }

    // Then delete the channels
    const { error, count } = await supabase.from("channels").delete().in("id", ids).select("count")

    if (error) {
      console.error("Error bulk deleting channels:", error)
      return { success: false, error: error.message }
    }

    return { success: true, deletedCount: count }
  } catch (error) {
    console.error("Unexpected error during bulk delete:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function bulkUpdateChannels(
  ids: number[],
  updates: Partial<Channel>,
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  if (!ids.length) {
    return { success: false, error: "No channels selected" }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No updates provided" }
  }

  try {
    // Create a copy of the updates to avoid modifying the original
    const updatesData = { ...updates }

    // If logo_url is a numeric ID, resolve it to the actual URL
    if (updatesData.logo_url && /^\d+$/.test(updatesData.logo_url)) {
      updatesData.logo_url = await resolveLogoUrl(updatesData.logo_url)
    }

    const supabase = await createClient()
    const { error, count } = await supabase.from("channels").update(updatesData).in("id", ids).select("count")

    if (error) {
      console.error("Error bulk updating channels:", error)
      return { success: false, error: error.message }
    }

    return { success: true, updatedCount: count }
  } catch (error) {
    console.error("Unexpected error during bulk update:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Service-Channel Mappings CRUD operations
export async function getMappings(): Promise<
  { mapping: ServiceChannel; service: StreamingService; channel: Channel }[]
> {
  const supabase = await createClient()
  // Get all mappings with service and channel details
  const { data, error } = await supabase
    .from("service_channels")
    .select(`
      *,
      service:service_id(id, name, logo_url),
      channel:channel_id(id, name, logo_url, category)
    `)
    .order("service_id")

  if (error) {
    console.error("Error fetching mappings:", error)
    return []
  }

  // Transform the data to the expected format
  return (data || []).map((item) => ({
    mapping: {
      service_id: item.service_id,
      channel_id: item.channel_id,
      tier: item.tier,
    },
    service: item.service as StreamingService,
    channel: item.channel as Channel,
  }))
}

export async function createMapping(mapping: ServiceChannel): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  // Check if mapping already exists
  const { data: existingMapping, error: checkError } = await supabase
    .from("service_channels")
    .select("*")
    .eq("service_id", mapping.service_id)
    .eq("channel_id", mapping.channel_id)
    .single()

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking existing mapping:", checkError)
    return { success: false, error: checkError.message }
  }

  if (existingMapping) {
    return { success: false, error: "This service-channel mapping already exists" }
  }

  // Create the mapping
  const { error } = await supabase.from("service_channels").insert([mapping])

  if (error) {
    console.error("Error creating mapping:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateMapping(
  serviceId: number,
  channelId: number,
  tier: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("service_channels")
      .update({ tier })
      .eq("service_id", serviceId)
      .eq("channel_id", channelId)

    if (error) {
      console.error("Error updating mapping:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating mapping:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

export async function deleteMapping(
  serviceId: number,
  channelId: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("service_channels")
    .delete()
    .eq("service_id", serviceId)
    .eq("channel_id", channelId)

  if (error) {
    console.error("Error deleting mapping:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getChannelCategories(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("channels").select("category").order("category")

  if (error) {
    console.error("Error fetching channel categories:", error)
    return []
  }

  // Extract unique categories
  const categories = [...new Set(data.map((item) => item.category))]
  return categories
}

export async function updateMappingTier(
  serviceId: number,
  channelId: number,
  tier: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("service_channels")
      .update({ tier })
      .eq("service_id", serviceId)
      .eq("channel_id", channelId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating mapping tier:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

export async function bulkDeleteMappings(
  mappings: { service_id: number; channel_id: number }[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    // Create an array of OR conditions for each mapping
    const orConditions = mappings.map((mapping) => ({
      and: [{ service_id: mapping.service_id }, { channel_id: mapping.channel_id }],
    }))

    const { error } = await supabase
      .from("service_channels")
      .delete()
      .or(
        orConditions
          .map(
            (condition) =>
              `and(service_id.eq.${condition.and[0].service_id},channel_id.eq.${condition.and[1].channel_id})`,
          )
          .join(","),
      )

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error bulk deleting mappings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

export async function bulkUpdateMappingTier(
  mappings: { service_id: number; channel_id: number }[],
  tier: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    // Process each mapping individually
    const promises = mappings.map((mapping) =>
      supabase
        .from("service_channels")
        .update({ tier })
        .eq("service_id", mapping.service_id)
        .eq("channel_id", mapping.channel_id),
    )

    const results = await Promise.all(promises)

    // Check if any errors occurred
    const errors = results.filter((result) => result.error)
    if (errors.length > 0) {
      throw new Error(`${errors.length} errors occurred during bulk update`)
    }

    return { success: true }
  } catch (error) {
    console.error("Error bulk updating mapping tiers:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

export async function batchCreateMappings(
  mappings: ServiceChannel[],
): Promise<{ success: boolean; created: number; skipped: number; error?: string }> {
  try {
    const supabase = await createClient()
    if (!mappings.length) {
      return { success: false, created: 0, skipped: 0, error: "No mappings provided" }
    }

    // Check for existing mappings to avoid duplicates
    const existingMappingsPromises = mappings.map((mapping) =>
      supabase
        .from("service_channels")
        .select("*")
        .eq("service_id", mapping.service_id)
        .eq("channel_id", mapping.channel_id)
        .maybeSingle(),
    )

    const existingResults = await Promise.all(existingMappingsPromises)

    // Filter out mappings that already exist
    const newMappings = mappings.filter((mapping, index) => !existingResults[index].data)
    const skippedCount = mappings.length - newMappings.length

    if (newMappings.length === 0) {
      return {
        success: true,
        created: 0,
        skipped: skippedCount,
        error: skippedCount > 0 ? "All mappings already exist" : undefined,
      }
    }

    // Insert new mappings
    const { error, count } = await supabase.from("service_channels").insert(newMappings).select("count")

    if (error) throw error

    return {
      success: true,
      created: count || newMappings.length,
      skipped: skippedCount,
    }
  } catch (error) {
    console.error("Error creating batch mappings:", error)
    return {
      success: false,
      created: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}
