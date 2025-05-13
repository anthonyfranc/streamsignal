"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { supabase } from "@/lib/supabase"
import type { Service } from "@/types/streaming"
import { getSupabase } from "@/lib/supabase-server"

export interface ServiceWithDetails extends Service {
  channel_count: number
}

export async function getAllServicesWithDetails(): Promise<ServiceWithDetails[]> {
  try {
    // Get all services - using streaming_services table instead of services
    const { data: services, error } = await supabase.from("streaming_services").select("*").order("name")

    if (error) {
      console.error("Error fetching services:", error)
      return []
    }

    if (!services || services.length === 0) {
      return []
    }

    // Get channel counts for each service
    const serviceIds = services.map((service) => service.id)

    // Get channel counts using a more compatible approach
    const { data: serviceChannels, error: channelsError } = await supabase
      .from("service_channels")
      .select("service_id")
      .in("service_id", serviceIds)

    if (channelsError) {
      console.error("Error fetching service channels:", channelsError)
      // Continue with empty channel counts
    }

    // Count channels per service
    const channelCounts: Record<number, number> = {}
    serviceChannels?.forEach((item) => {
      if (item.service_id) {
        channelCounts[item.service_id] = (channelCounts[item.service_id] || 0) + 1
      }
    })

    // Get genres for each service
    let genres: Record<number, string[]> = {}
    try {
      const { data: genreData, error: genreError } = await supabase
        .from("service_genres")
        .select("service_id, genre")
        .in("service_id", serviceIds)

      if (genreError) {
        console.error("Error fetching service genres:", genreError)
      } else if (genreData) {
        // Group genres by service_id
        genreData.forEach((item) => {
          if (item.service_id && item.genre) {
            if (!genres[item.service_id]) {
              genres[item.service_id] = []
            }
            genres[item.service_id].push(item.genre)
          }
        })
      }
    } catch (error) {
      console.error("Error fetching service genres:", error)
      // Continue with empty genres
      genres = {}
    }

    // Get devices for each service
    let devices: Record<number, string[]> = {}
    try {
      const { data: deviceData, error: deviceError } = await supabase
        .from("service_devices")
        .select("service_id, device")
        .in("service_id", serviceIds)

      if (deviceError) {
        console.error("Error fetching service devices:", deviceError)
      } else if (deviceData) {
        // Group devices by service_id
        deviceData.forEach((item) => {
          if (item.service_id && item.device) {
            if (!devices[item.service_id]) {
              devices[item.service_id] = []
            }
            devices[item.service_id].push(item.device)
          }
        })
      }
    } catch (error) {
      console.error("Error fetching service devices:", error)
      // Continue with empty devices
      devices = {}
    }

    // Combine all data
    const servicesWithDetails: ServiceWithDetails[] = services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description || "",
      logo_url: service.logo_url,
      monthly_price: service.monthly_price || 0,
      channel_count: channelCounts[service.id] || 0,
      genres: genres[service.id] || [],
      devices: devices[service.id] || [],
    }))

    return servicesWithDetails
  } catch (error) {
    console.error("Error in getAllServicesWithDetails:", error)
    return []
  }
}

export async function getServiceGenres(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("service_genres").select("genre").order("genre")

    if (error) {
      console.error("Error fetching service genres:", error)
      return []
    }

    // Extract unique genres
    const uniqueGenres = new Set<string>()
    data?.forEach((item) => {
      if (item.genre) {
        uniqueGenres.add(item.genre)
      }
    })

    return Array.from(uniqueGenres)
  } catch (error) {
    console.error("Error in getServiceGenres:", error)
    return []
  }
}

export async function getSupportedDevices(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("service_devices").select("device").order("device")

    if (error) {
      console.error("Error fetching supported devices:", error)
      return []
    }

    // Extract unique devices
    const uniqueDevices = new Set<string>()
    data?.forEach((item) => {
      if (item.device) {
        uniqueDevices.add(item.device)
      }
    })

    return Array.from(uniqueDevices)
  } catch (error) {
    console.error("Error in getSupportedDevices:", error)
    return []
  }
}

export async function searchServices(
  query = "",
  genre = "all",
  priceRange: [number, number] | null = null,
  device = "all",
): Promise<ServiceWithDetails[]> {
  try {
    // Get all services first
    const allServices = await getAllServicesWithDetails()

    // Filter based on search criteria
    return allServices.filter((service) => {
      // Filter by search query
      if (
        query &&
        !service.name.toLowerCase().includes(query.toLowerCase()) &&
        !service.description.toLowerCase().includes(query.toLowerCase())
      ) {
        return false
      }

      // Filter by genre
      if (genre !== "all" && !service.genres.includes(genre)) {
        return false
      }

      // Filter by price range
      if (priceRange && (service.monthly_price < priceRange[0] || service.monthly_price > priceRange[1])) {
        return false
      }

      // Filter by device
      if (device !== "all" && !service.devices.includes(device)) {
        return false
      }

      return true
    })
  } catch (error) {
    console.error("Error in searchServices:", error)
    return []
  }
}

// Update the getFeaturedServices function to work with the client component
export async function getFeaturedServices(limit = 3) {
  try {
    // This would normally be a database query
    // For now, return mock data
    return [
      {
        id: "1",
        name: "Netflix",
        description: "Watch movies and TV shows",
        logo: "/streaming-service-interface.png",
      },
      {
        id: "2",
        name: "Hulu",
        description: "Stream TV shows and movies",
        logo: "/placeholder.svg?key=ibthc",
      },
      {
        id: "3",
        name: "Disney+",
        description: "Stream Disney, Marvel, and more",
        logo: "/magical-castle.png",
      },
    ].slice(0, limit)
  } catch (error) {
    console.error("Error fetching featured services:", error)
    return []
  }
}

// Keep all existing functions, but add revalidation to mutation functions

// Example of how to update one of the mutation functions:
export async function createService(formData: FormData) {
  const supabase = getSupabase()

  // Extract form data...

  const { data, error } = await supabase
    .from("streaming_services")
    .insert([
      // Service data...
    ])
    .select()

  // Revalidate paths after creating a service
  revalidatePath("/services")
  revalidateTag("services")

  return { data, error }
}

export async function updateService(id: number, formData: FormData) {
  const supabase = getSupabase()

  // Extract form data...

  const { data, error } = await supabase
    .from("streaming_services")
    .update({
      // Updated service data...
    })
    .eq("id", id)
    .select()

  // Revalidate specific paths after updating
  revalidatePath(`/services/${id}`)
  revalidatePath("/services")
  revalidateTag("services")

  return { data, error }
}

export async function deleteService(id: number) {
  const supabase = getSupabase()

  const { error } = await supabase.from("streaming_services").delete().eq("id", id)

  // Revalidate paths after deletion
  revalidatePath("/services")
  revalidateTag("services")

  return { error }
}
