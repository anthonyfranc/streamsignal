"use server"

import { supabaseServer } from "@/lib/supabase"
import type { FilterPreset } from "@/types/filters"
import { revalidatePath } from "next/cache"

// Get all filter presets for a specific entity
export async function getFilterPresets(entity: "services" | "channels" | "mappings"): Promise<FilterPreset[]> {
  const { data, error } = await supabaseServer.from("filter_presets").select("*").eq("entity", entity).order("name")

  if (error) {
    console.error("Error fetching filter presets:", error)
    return []
  }

  return data as FilterPreset[]
}

// Get a specific filter preset by ID
export async function getFilterPresetById(id: string): Promise<FilterPreset | null> {
  const { data, error } = await supabaseServer.from("filter_presets").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching filter preset:", error)
    return null
  }

  return data as FilterPreset
}

// Create a new filter preset
export async function createFilterPreset(
  preset: Omit<FilterPreset, "id" | "created_at" | "updated_at">,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const now = new Date().toISOString()

  const { data, error } = await supabaseServer
    .from("filter_presets")
    .insert([
      {
        ...preset,
        created_at: now,
        updated_at: now,
      },
    ])
    .select()

  if (error) {
    console.error("Error creating filter preset:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/${preset.entity}`)
  return { success: true, id: data[0].id }
}

// Update an existing filter preset
export async function updateFilterPreset(
  id: string,
  updates: Partial<Omit<FilterPreset, "id" | "created_at" | "updated_at">>,
): Promise<{ success: boolean; error?: string }> {
  const { data: existingPreset, error: fetchError } = await supabaseServer
    .from("filter_presets")
    .select("entity")
    .eq("id", id)
    .single()

  if (fetchError) {
    console.error("Error fetching filter preset for update:", fetchError)
    return { success: false, error: fetchError.message }
  }

  const { error } = await supabaseServer
    .from("filter_presets")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Error updating filter preset:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/${existingPreset.entity}`)
  return { success: true }
}

// Delete a filter preset
export async function deleteFilterPreset(id: string): Promise<{ success: boolean; error?: string }> {
  const { data: existingPreset, error: fetchError } = await supabaseServer
    .from("filter_presets")
    .select("entity")
    .eq("id", id)
    .single()

  if (fetchError) {
    console.error("Error fetching filter preset for deletion:", fetchError)
    return { success: false, error: fetchError.message }
  }

  const { error } = await supabaseServer.from("filter_presets").delete().eq("id", id)

  if (error) {
    console.error("Error deleting filter preset:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/${existingPreset.entity}`)
  return { success: true }
}

// Set a filter preset as default
export async function setDefaultFilterPreset(
  id: string,
  entity: "services" | "channels" | "mappings",
): Promise<{ success: boolean; error?: string }> {
  // First, unset any existing default for this entity
  const { error: unsetError } = await supabaseServer
    .from("filter_presets")
    .update({ is_default: false })
    .eq("entity", entity)
    .eq("is_default", true)

  if (unsetError) {
    console.error("Error unsetting default filter preset:", unsetError)
    return { success: false, error: unsetError.message }
  }

  // Then set the new default
  const { error } = await supabaseServer.from("filter_presets").update({ is_default: true }).eq("id", id)

  if (error) {
    console.error("Error setting default filter preset:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/${entity}`)
  return { success: true }
}
