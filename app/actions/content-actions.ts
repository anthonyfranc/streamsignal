"use server"

import { createClient } from "@/lib/supabase-server"
import type { ContentCategory, ContentItem, AddonService } from "@/types/streaming"

export async function getContentCategoriesByServiceId(serviceId: number): Promise<ContentCategory[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("content_categories")
      .select("*")
      .eq("service_id", serviceId)
      .order("name")

    if (error) {
      console.error("Error fetching content categories:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Unexpected error in getContentCategoriesByServiceId:", error)
    return []
  }
}

export async function getContentItemsByCategoryId(categoryId: number): Promise<ContentItem[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .eq("category_id", categoryId)
      .order("title")

    if (error) {
      console.error("Error fetching content items:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Unexpected error in getContentItemsByCategoryId:", error)
    return []
  }
}

export async function getContentCategoriesWithItemsByServiceId(serviceId: number): Promise<ContentCategory[]> {
  // First get all categories for this service
  const categories = await getContentCategoriesByServiceId(serviceId)

  if (categories.length === 0) {
    return []
  }

  // For each category, get its items
  const categoriesWithItems = await Promise.all(
    categories.map(async (category) => {
      const items = await getContentItemsByCategoryId(category.id)
      return {
        ...category,
        items,
      }
    }),
  )

  return categoriesWithItems
}

export async function getAddonServicesByParentId(parentServiceId: number): Promise<AddonService[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("addon_services").select("*").eq("parent_service_id", parentServiceId)

    if (error) {
      console.error("Error fetching addon services:", error)
      return []
    }

    // If we have addon services, fetch the details of each addon service
    if (data.length > 0) {
      const addonServiceIds = data.map((addon) => addon.addon_service_id)

      const { data: addonServicesData, error: addonServicesError } = await supabase
        .from("streaming_services")
        .select("*")
        .in("id", addonServiceIds)

      if (addonServicesError) {
        console.error("Error fetching addon service details:", addonServicesError)
        return data
      }

      // Combine the addon service details with the addon service data
      return data.map((addon) => {
        const addonServiceDetails = addonServicesData.find((service) => service.id === addon.addon_service_id)
        return {
          ...addon,
          addon_service: addonServiceDetails,
        }
      })
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getAddonServicesByParentId:", error)
    return []
  }
}
