"use server"

import { supabaseServer } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { deleteFromBlob } from "@/lib/blob-storage"

export interface MediaAsset {
  id: number
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  width?: number
  height?: number
  url: string
  thumbnail_url?: string
  alt_text?: string
  category: string
  tags?: string[]
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface MediaUsage {
  id: number
  media_id: number
  entity_type: string
  entity_id: number
  usage_type: string
  created_at: string
}

export interface MediaUploadResult {
  success: boolean
  asset?: MediaAsset
  error?: string
}

export interface MediaCategory {
  name: string
  count: number
}

// Get all media assets with optional filtering
export async function getMediaAssets(options?: {
  category?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ assets: MediaAsset[]; total: number }> {
  try {
    let query = supabaseServer.from("media_assets").select("*", { count: "exact" })

    // Apply filters if provided
    if (options?.category) {
      query = query.eq("category", options.category)
    }

    if (options?.search) {
      query = query.or(
        `original_filename.ilike.%${options.search}%,alt_text.ilike.%${options.search}%,filename.ilike.%${options.search}%`,
      )
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    // Order by most recent first
    query = query.order("created_at", { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching media assets:", error)
      return { assets: [], total: 0 }
    }

    return { assets: data as MediaAsset[], total: count || 0 }
  } catch (error) {
    console.error("Error in getMediaAssets:", error)
    return { assets: [], total: 0 }
  }
}

// Get a single media asset by ID
export async function getMediaAssetById(id: number): Promise<MediaAsset | null> {
  try {
    const { data, error } = await supabaseServer.from("media_assets").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching media asset:", error)
      return null
    }

    return data as MediaAsset
  } catch (error) {
    console.error("Error in getMediaAssetById:", error)
    return null
  }
}

// Create a new media asset
export async function createMediaAsset(
  asset: Omit<MediaAsset, "id" | "created_at" | "updated_at">,
): Promise<MediaUploadResult> {
  try {
    const { data, error } = await supabaseServer.from("media_assets").insert([asset]).select()

    if (error) {
      console.error("Error creating media asset:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/media")
    return { success: true, asset: data[0] as MediaAsset }
  } catch (error) {
    console.error("Error in createMediaAsset:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Update a media asset
export async function updateMediaAsset(
  id: number,
  updates: Partial<Omit<MediaAsset, "id" | "created_at" | "updated_at">>,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Add updated_at timestamp
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabaseServer.from("media_assets").update(updatesWithTimestamp).eq("id", id)

    if (error) {
      console.error("Error updating media asset:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/media")
    return { success: true }
  } catch (error) {
    console.error("Error in updateMediaAsset:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Delete a media asset
export async function deleteMediaAsset(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if the asset is in use
    const { data: usageData, error: usageError } = await supabaseServer
      .from("media_usage")
      .select("id")
      .eq("media_id", id)

    if (usageError) {
      console.error("Error checking media usage:", usageError)
      return { success: false, error: usageError.message }
    }

    if (usageData && usageData.length > 0) {
      return {
        success: false,
        error: `Cannot delete: This media is used in ${usageData.length} place(s). Remove those references first.`,
      }
    }

    // Get the asset to get the URL for blob deletion
    const asset = await getMediaAssetById(id)
    if (!asset) {
      return { success: false, error: "Asset not found" }
    }

    // Delete from blob storage if it's a blob URL
    if (asset.url && (asset.url.includes("blob.vercel-storage.com") || asset.url.includes("blob.vercel.app"))) {
      const blobResult = await deleteFromBlob(asset.url)
      if (!blobResult.success) {
        console.error("Error deleting from blob storage:", blobResult.error)
        // Continue with database deletion even if blob deletion fails
      }
    }

    // Delete thumbnail if it exists and is different from the main URL
    if (
      asset.thumbnail_url &&
      asset.thumbnail_url !== asset.url &&
      (asset.thumbnail_url.includes("blob.vercel-storage.com") || asset.thumbnail_url.includes("blob.vercel.app"))
    ) {
      await deleteFromBlob(asset.thumbnail_url).catch((err) => {
        console.error("Error deleting thumbnail from blob storage:", err)
      })
    }

    // If not in use, delete the asset from the database
    const { error } = await supabaseServer.from("media_assets").delete().eq("id", id)

    if (error) {
      console.error("Error deleting media asset:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/admin/media")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteMediaAsset:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Track media usage
export async function trackMediaUsage(
  mediaId: number,
  entityType: string,
  entityId: number,
  usageType: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if this usage already exists
    const { data: existingUsage, error: checkError } = await supabaseServer
      .from("media_usage")
      .select("id")
      .eq("media_id", mediaId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("usage_type", usageType)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking media usage:", checkError)
      return { success: false, error: checkError.message }
    }

    // If usage already exists, we're done
    if (existingUsage) {
      return { success: true }
    }

    // Create new usage record
    const { error } = await supabaseServer.from("media_usage").insert([
      {
        media_id: mediaId,
        entity_type: entityType,
        entity_id: entityId,
        usage_type: usageType,
      },
    ])

    if (error) {
      console.error("Error tracking media usage:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in trackMediaUsage:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Remove media usage
export async function removeMediaUsage(
  mediaId: number,
  entityType: string,
  entityId: number,
  usageType: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseServer
      .from("media_usage")
      .delete()
      .eq("media_id", mediaId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("usage_type", usageType)

    if (error) {
      console.error("Error removing media usage:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in removeMediaUsage:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

// Get media categories with counts
export async function getMediaCategories(): Promise<MediaCategory[]> {
  try {
    const { data, error } = await supabaseServer.from("media_assets").select("category").order("category")

    if (error) {
      console.error("Error fetching media categories:", error)
      return []
    }

    // Count occurrences of each category
    const categoryCounts: Record<string, number> = {}
    data.forEach((item) => {
      const category = item.category
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    // Convert to array of objects
    return Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }))
  } catch (error) {
    console.error("Error in getMediaCategories:", error)
    return []
  }
}

// Get media usage for an asset
export async function getMediaUsageByAssetId(mediaId: number): Promise<MediaUsage[]> {
  try {
    const { data, error } = await supabaseServer
      .from("media_usage")
      .select("*")
      .eq("media_id", mediaId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching media usage:", error)
      return []
    }

    return data as MediaUsage[]
  } catch (error) {
    console.error("Error in getMediaUsageByAssetId:", error)
    return []
  }
}

// Get media assets used by an entity
export async function getMediaAssetsByEntity(entityType: string, entityId: number): Promise<MediaAsset[]> {
  try {
    const { data, error } = await supabaseServer
      .from("media_usage")
      .select(`
        media_id,
        usage_type,
        media:media_id(*)
      `)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)

    if (error) {
      console.error("Error fetching entity media assets:", error)
      return []
    }

    // Transform the data to return the media assets with usage type
    return data.map((item) => ({
      ...(item.media as MediaAsset),
      usage_type: item.usage_type,
    }))
  } catch (error) {
    console.error("Error in getMediaAssetsByEntity:", error)
    return []
  }
}
