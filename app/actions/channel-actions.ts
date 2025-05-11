"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { supabase } from "@/lib/supabase"
import type { Channel } from "@/types/streaming"
import { getSupabase } from "@/lib/supabase-server"

export interface ChannelWithServices extends Channel {
  services: {
    id: number
    name: string
    logo_url: string
    monthly_price: number
    tier: string
  }[]
}

export interface ChannelWithDetails extends Channel {
  service_count: number
}

export interface Program {
  id: number
  channel_id: number
  title: string
  description: string
  image_url: string | null
  type: string
  air_time: string | null
  duration: string | null
  rating: number
}

// New function to get channels for a specific service
export async function getChannelsForService(serviceId: number): Promise<Channel[]> {
  try {
    const { data, error } = await supabase
      .from("service_channels")
      .select(`
        channel_id,
        channels (
          id,
          name,
          logo_url,
          category,
          popularity
        )
      `)
      .eq("service_id", serviceId)
      .order("channel_id")

    if (error) {
      console.error("Error fetching channels for service:", error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Extract the channel data from the nested structure
    return data.map((item) => ({
      id: item.channels.id,
      name: item.channels.name,
      logo_url: item.channels.logo_url,
      category: item.channels.category,
      popularity: item.channels.popularity,
      created_at: "", // This field might not be available in this query
    }))
  } catch (error) {
    console.error("Error in getChannelsForService:", error)
    return []
  }
}

// Update the getFeaturedChannels function to work with the client component
export async function getFeaturedChannels(limit = 3) {
  try {
    // This would normally be a database query
    // For now, return mock data
    return [
      {
        id: "1",
        name: "HBO",
        description: "Premium entertainment channel",
        logo: "/placeholder.svg?key=eazqp",
      },
      {
        id: "2",
        name: "ESPN",
        description: "Sports programming channel",
        logo: "/placeholder.svg?key=5g4vi",
      },
      {
        id: "3",
        name: "Discovery",
        description: "Educational and documentary channel",
        logo: "/placeholder.svg?key=5gkis",
      },
    ].slice(0, limit)
  } catch (error) {
    console.error("Error fetching featured channels:", error)
    return []
  }
}

export async function getAllChannelsWithServices(): Promise<ChannelWithServices[]> {
  try {
    const { data, error } = await supabase
      .from("channels")
      .select(`
        id,
        name,
        logo_url,
        category,
        popularity,
        created_at,
        service_channels (
          service_id,
          tier,
          streaming_services (
            id,
            name,
            logo_url,
            monthly_price
          )
        )
      `)
      .order("name")

    if (error) {
      console.error("Error fetching channels with services:", error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((channel) => ({
      id: channel.id,
      name: channel.name,
      logo_url: channel.logo_url,
      category: channel.category,
      popularity: channel.popularity,
      created_at: channel.created_at,
      services: channel.service_channels.map((sc) => ({
        id: sc.service_id,
        name: sc.streaming_services?.name || "Unknown Service",
        logo_url: sc.streaming_services?.logo_url || null,
        monthly_price: sc.streaming_services?.monthly_price || 0,
        tier: sc.tier,
      })),
    }))
  } catch (error) {
    console.error("Error in getAllChannelsWithServices:", error)
    return []
  }
}

export async function searchChannels(query: string, category: string): Promise<ChannelWithServices[]> {
  try {
    let dbQuery = supabase
      .from("channels")
      .select(`
        id,
        name,
        logo_url,
        category,
        popularity,
        created_at,
        service_channels (
          service_id,
          tier,
          streaming_services (
            id,
            name,
            logo_url,
            monthly_price
          )
        )
      `)
      .order("name")

    if (query) {
      dbQuery = dbQuery.ilike("name", `%${query}%`)
    }

    if (category && category !== "all") {
      dbQuery = dbQuery.eq("category", category)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error("Error searching channels:", error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((channel) => ({
      id: channel.id,
      name: channel.name,
      logo_url: channel.logo_url,
      category: channel.category,
      popularity: channel.popularity,
      created_at: channel.created_at,
      services: channel.service_channels.map((sc) => ({
        id: sc.service_id,
        name: sc.streaming_services?.name || "Unknown Service",
        logo_url: sc.streaming_services?.logo_url || null,
        monthly_price: sc.streaming_services?.monthly_price || 0,
        tier: sc.tier,
      })),
    }))
  } catch (error) {
    console.error("Error in searchChannels:", error)
    return []
  }
}

export async function getChannelCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("channels").select("category").order("category")

    if (error) {
      console.error("Error fetching channel categories:", error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Extract unique categories
    const categories = [...new Set(data.map((item) => item.category))]
    return categories
  } catch (error) {
    console.error("Error in getChannelCategories:", error)
    return []
  }
}

export async function getChannelById(id: number): Promise<ChannelWithServices | null> {
  try {
    const { data, error } = await supabase
      .from("channels")
      .select(`
        id,
        name,
        logo_url,
        category,
        popularity,
        created_at,
        service_channels (
          service_id,
          tier,
          streaming_services (
            id,
            name,
            logo_url,
            monthly_price
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching channel with services:", error)
      return null
    }

    if (!data) {
      return null
    }

    return {
      id: data.id,
      name: data.name,
      logo_url: data.logo_url,
      category: data.category,
      popularity: data.popularity,
      created_at: data.created_at,
      services: data.service_channels.map((sc) => ({
        id: sc.service_id,
        name: sc.streaming_services?.name || "Unknown Service",
        logo_url: sc.streaming_services?.logo_url || null,
        monthly_price: sc.streaming_services?.monthly_price || 0,
        tier: sc.tier,
      })),
    }
  } catch (error) {
    console.error("Error in getChannelById:", error)
    return null
  }
}

export async function getChannelPrograms(channelId: number): Promise<Program[]> {
  try {
    // For now, using mock data since we don't have a programs table
    // In a real implementation, you would query the database
    const programs: Program[] = [
      {
        id: 1,
        channel_id: channelId,
        title: "SportsCenter",
        description: "Daily sports news and highlights.",
        image_url: "/placeholder.svg?height=200&width=300",
        type: "live",
        air_time: "6:00 PM",
        duration: "60 min",
        rating: 4.5,
      },
      {
        id: 2,
        channel_id: channelId,
        title: "Pardon the Interruption",
        description: "Sports debate show.",
        image_url: "/placeholder.svg?height=200&width=300",
        type: "live",
        air_time: "7:00 PM",
        duration: "30 min",
        rating: 4.2,
      },
    ]

    return programs
  } catch (error) {
    console.error("Error in getChannelPrograms:", error)
    return []
  }
}

export async function getSimilarChannels(channelId: number): Promise<ChannelWithServices[]> {
  try {
    // Get the category of the current channel
    const { data: currentChannel, error: channelError } = await supabase
      .from("channels")
      .select("category")
      .eq("id", channelId)
      .single()

    if (channelError || !currentChannel) {
      console.error("Error fetching current channel:", channelError)
      return []
    }

    // Get channels in the same category
    const { data, error } = await supabase
      .from("channels")
      .select(`
        id,
        name,
        logo_url,
        category,
        popularity,
        created_at,
        service_channels (
          service_id,
          tier,
          streaming_services (
            id,
            name,
            logo_url,
            monthly_price
          )
        )
      `)
      .eq("category", currentChannel.category)
      .neq("id", channelId) // Exclude the current channel
      .order("popularity", { ascending: false })
      .limit(2)

    if (error) {
      console.error("Error fetching similar channels:", error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((channel) => ({
      id: channel.id,
      name: channel.name,
      logo_url: channel.logo_url,
      category: channel.category,
      popularity: channel.popularity,
      created_at: channel.created_at,
      services: channel.service_channels.map((sc) => ({
        id: sc.service_id,
        name: sc.streaming_services?.name || "Unknown Service",
        logo_url: sc.streaming_services?.logo_url || null,
        monthly_price: sc.streaming_services?.monthly_price || 0,
        tier: sc.tier,
      })),
    }))
  } catch (error) {
    console.error("Error in getSimilarChannels:", error)
    return []
  }
}

// Example of how to update one of the mutation functions:
export async function createChannel(formData: FormData) {
  const supabase = getSupabase()

  // Extract form data...
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const logoUrl = formData.get("logoUrl") as string
  const category = formData.get("category") as string
  const popularity = Number.parseInt(formData.get("popularity") as string)

  const { data, error } = await supabase
    .from("channels")
    .insert([
      {
        name: name,
        description: description,
        logo_url: logoUrl,
        category: category,
        popularity: popularity,
      },
    ])
    .select()

  // Revalidate paths after creating a channel
  revalidatePath("/channels")
  revalidateTag("channels")

  return { data, error }
}

export async function updateChannel(id: number, formData: FormData) {
  const supabase = getSupabase()

  // Extract form data...
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const logoUrl = formData.get("logoUrl") as string
  const category = formData.get("category") as string
  const popularity = Number.parseInt(formData.get("popularity") as string)

  const { data, error } = await supabase
    .from("channels")
    .update({
      name: name,
      description: description,
      logo_url: logoUrl,
      category: category,
      popularity: popularity,
    })
    .eq("id", id)
    .select()

  // Revalidate specific paths after updating
  revalidatePath(`/channels/${id}`)
  revalidatePath("/channels")
  revalidateTag("channels")

  return { data, error }
}

export async function deleteChannel(id: number) {
  const supabase = getSupabase()

  const { error } = await supabase.from("channels").delete().eq("id", id)

  // Revalidate paths after deletion
  revalidatePath("/channels")
  revalidateTag("channels")

  return { error }
}
