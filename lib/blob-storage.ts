import { put, del } from "@vercel/blob"
import { validateAndSanitizeSVG } from "./svg-validator"

/**
 * Options for uploading to blob storage
 */
export interface BlobUploadOptions {
  filename: string
  contentType: string
  data: Buffer | Blob | ReadableStream
  access?: "public" | "private"
}

/**
 * Result of a blob upload operation
 */
export interface BlobUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Uploads a file to Vercel Blob storage
 */
export async function uploadToBlob({
  filename,
  contentType,
  data,
  access = "public",
}: BlobUploadOptions): Promise<BlobUploadResult> {
  try {
    // For SVG files, validate and sanitize before uploading
    if (contentType === "image/svg+xml" && data instanceof Buffer) {
      const svgContent = data.toString("utf-8")
      const validation = validateAndSanitizeSVG(svgContent)

      if (!validation.isValid) {
        return {
          success: false,
          error: `SVG validation failed: ${validation.error}`,
        }
      }

      // Use sanitized version if available
      if (validation.sanitized) {
        data = Buffer.from(validation.sanitized, "utf-8")
      }
    }

    // Upload to Vercel Blob
    const blob = await put(filename, data, {
      contentType,
      access,
    })

    return {
      success: true,
      url: blob.url,
    }
  } catch (error) {
    console.error("Error uploading to blob storage:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error uploading to blob storage",
    }
  }
}

/**
 * Deletes a file from Vercel Blob storage
 */
export async function deleteFromBlob(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    await del(url)
    return { success: true }
  } catch (error) {
    console.error("Error deleting from blob storage:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error deleting from blob storage",
    }
  }
}
