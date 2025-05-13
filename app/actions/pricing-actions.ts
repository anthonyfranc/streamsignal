"use server"

import { createClient } from "@/lib/supabase-server"
import type { ServiceTier, CreateServiceTierInput, UpdateServiceTierInput } from "@/types/pricing"

// Get all tiers for a specific service
export async function getServiceTiers(serviceId: number): Promise<ServiceTier[]> {
  console.log(`Fetching tiers for service ID: ${serviceId}`)

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("service_tiers")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order")

    if (error) {
      console.error("Error fetching service tiers:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getServiceTiers:", error)
    return []
  }
}

// Get a specific tier by ID
export async function getServiceTierById(tierId: number): Promise<ServiceTier | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("service_tiers").select("*").eq("id", tierId).single()

    if (error) {
      console.error("Error fetching service tier:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getServiceTierById:", error)
    return null
  }
}

// Create a new tier
export async function createServiceTier(
  tier: CreateServiceTierInput,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    console.log("Creating service tier with data:", JSON.stringify(tier, null, 2))

    const supabase = await createClient()
    const { data, error } = await supabase.from("service_tiers").insert([tier]).select()

    if (error) {
      console.error("Error creating service tier:", error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from database" }
    }

    console.log("Service tier created successfully:", data[0])
    return { success: true, id: data[0].id }
  } catch (error) {
    console.error("Exception creating service tier:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Update an existing tier
export async function updateServiceTier(tier: UpdateServiceTierInput): Promise<{ success: boolean; error?: string }> {
  try {
    const { id, service_id, ...updateData } = tier

    console.log(`Updating service tier ID: ${id} with data:`, JSON.stringify(updateData, null, 2))

    const supabase = await createClient()
    const { error } = await supabase.from("service_tiers").update(updateData).eq("id", id).eq("service_id", service_id)

    if (error) {
      console.error("Error updating service tier:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception updating service tier:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Delete a tier
export async function deleteServiceTier(
  tierId: number,
  serviceId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Deleting service tier ID: ${tierId} for service ID: ${serviceId}`)

    const supabase = await createClient()
    const { error } = await supabase.from("service_tiers").delete().eq("id", tierId).eq("service_id", serviceId)

    if (error) {
      console.error("Error deleting service tier:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception deleting service tier:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Update the order of tiers
export async function updateTierOrder(
  serviceId: number,
  tierIds: number[],
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Updating tier order for service ID: ${serviceId}`, tierIds)

    const supabase = await createClient()
    // Create an array of promises for each update operation
    const updatePromises = tierIds.map((tierId, index) =>
      supabase.from("service_tiers").update({ sort_order: index }).eq("id", tierId).eq("service_id", serviceId),
    )

    // Execute all updates in parallel
    const results = await Promise.all(updatePromises)

    // Check if any errors occurred
    const errors = results.filter((result) => result.error)
    if (errors.length > 0) {
      console.error("Errors updating tier order:", errors)
      return {
        success: false,
        error: `${errors.length} errors occurred while updating tier order`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception updating tier order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

// Get tiers for comparison
export async function getTiersForComparison(tierIds: number[]): Promise<ServiceTier[]> {
  if (!tierIds.length) return []

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("service_tiers").select("*").in("id", tierIds).order("sort_order")

    if (error) {
      console.error("Error fetching tiers for comparison:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Exception fetching tiers for comparison:", error)
    return []
  }
}

// Clear promotion for a tier
export async function clearPromotion(tierId: number, serviceId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from("service_tiers")
      .update({
        promo_price: null,
        promo_start_date: null,
        promo_end_date: null,
        promo_description: null,
      })
      .eq("id", tierId)
      .eq("service_id", serviceId)

    if (error) {
      console.error("Error clearing promotion:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Exception clearing promotion:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
