"use server"

import { createClient } from "@/lib/supabase-server"
import type { ContentCategory, ContentItem, AddonService } from "@/types/streaming"

// Content Category Management
export async function createContentCategory(
  category: Omit<ContentCategory, "id" | "created_at">,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("content_categories").insert([category]).select()

    if (error) {
      console.error("Error creating content category:", error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from database" }
    }

    return { success: true, id: data[0].id }
  } catch (error) {
    console.error("Exception creating content category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function updateContentCategory(
  id: number,
  category: Partial<ContentCategory>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("content_categories").update(category).eq("id", id)

    if (error) {
      console.error("Error updating content category:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception updating content category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function deleteContentCategory(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    // First delete all content items in this category
    const { error: itemsError } = await supabase.from("content_items").delete().eq("category_id", id)

    if (itemsError) {
      console.error("Error deleting content items:", itemsError)
      return { success: false, error: itemsError.message }
    }

    // Then delete the category
    const { error } = await supabase.from("content_categories").delete().eq("id", id)

    if (error) {
      console.error("Error deleting content category:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception deleting content category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Content Item Management
export async function createContentItem(
  item: Omit<ContentItem, "id" | "created_at">,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("content_items").insert([item]).select()

    if (error) {
      console.error("Error creating content item:", error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from database" }
    }

    return { success: true, id: data[0].id }
  } catch (error) {
    console.error("Exception creating content item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function updateContentItem(
  id: number,
  item: Partial<ContentItem>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("content_items").update(item).eq("id", id)

    if (error) {
      console.error("Error updating content item:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception updating content item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function deleteContentItem(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("content_items").delete().eq("id", id)

    if (error) {
      console.error("Error deleting content item:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception deleting content item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Add-on Service Management
export async function createAddonService(
  addon: Omit<AddonService, "id" | "created_at">,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const supabase = await createClient()
    // First check if this addon service relationship already exists
    const { data: existingAddon, error: checkError } = await supabase
      .from("addon_services")
      .select("*")
      .eq("parent_service_id", addon.parent_service_id)
      .eq("addon_service_id", addon.addon_service_id)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing addon:", checkError)
      return { success: false, error: checkError.message }
    }

    if (existingAddon) {
      return { success: false, error: "This add-on service relationship already exists" }
    }

    // Create the addon service relationship
    const { data, error } = await supabase.from("addon_services").insert([addon]).select()

    if (error) {
      console.error("Error creating addon service:", error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from database" }
    }

    return { success: true, id: data[0].id }
  } catch (error) {
    console.error("Exception creating addon service:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function updateAddonService(
  id: number,
  addon: Partial<AddonService>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("addon_services").update(addon).eq("id", id)

    if (error) {
      console.error("Error updating addon service:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception updating addon service:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function deleteAddonService(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("addon_services").delete().eq("id", id)

    if (error) {
      console.error("Error deleting addon service:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception deleting addon service:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Get available services for add-ons (services that are not already add-ons for this parent service)
export async function getAvailableAddonServices(parentServiceId: number): Promise<{ id: number; name: string }[]> {
  try {
    const supabase = await createClient()
    // Get all current addon services for this parent
    const { data: currentAddons, error: addonsError } = await supabase
      .from("addon_services")
      .select("addon_service_id")
      .eq("parent_service_id", parentServiceId)

    if (addonsError) {
      console.error("Error fetching current addons:", addonsError)
      return []
    }

    // Get all services except the parent service and current addons
    const currentAddonIds = currentAddons.map((addon) => addon.addon_service_id)
    const ids = [...currentAddonIds, parentServiceId]

    const { data: availableServices, error: servicesError } = await supabase
      .from("streaming_services")
      .select("id, name")
      .not("id", "in", `(${ids.join(",")})`)
      .order("name")

    if (servicesError) {
      console.error("Error fetching available services:", servicesError)
      return []
    }

    return availableServices || []
  } catch (error) {
    console.error("Exception fetching available addon services:", error)
    return []
  }
}
