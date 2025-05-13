"use server"
import { revalidatePath } from "next/cache"
import { createMediaAsset, type MediaUploadResult } from "./media-actions"
import { validateAndSanitizeSVG } from "@/lib/svg-validator"
import { uploadToBlob } from "@/lib/blob-storage"

// Maximum file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp"]

interface FetchImageResult {
  success: boolean
  buffer?: Buffer
  contentType?: string
  filename?: string
  size?: number
  error?: string
}

/**
 * Fetches an image from a URL and returns its buffer and metadata
 */
async function fetchImageFromUrl(url: string): Promise<FetchImageResult> {
  try {
    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch (error) {
      return { success: false, error: "Invalid URL format" }
    }

    // Attempt to fetch the image
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // Some servers require a user agent
        "User-Agent": "StreamSignal Media Fetcher",
      },
      // Set a reasonable timeout
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch image: HTTP ${response.status} ${response.statusText}`,
      }
    }

    // Check content type
    const contentType = response.headers.get("content-type")
    if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
      return {
        success: false,
        error: `Unsupported file type: ${contentType || "unknown"}. Supported types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      }
    }

    // Get file size from headers if available
    let size = Number.parseInt(response.headers.get("content-length") || "0", 10)

    // Read the response as an array buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // If content-length header wasn't available, use the actual buffer size
    if (!size) {
      size = buffer.length
    }

    // Check file size
    if (size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${(size / (1024 * 1024)).toFixed(2)}MB. Maximum size: ${
          MAX_FILE_SIZE / (1024 * 1024)
        }MB`,
      }
    }

    // Extract filename from URL or generate one
    const urlPath = parsedUrl.pathname
    const urlFilename = urlPath.split("/").pop() || ""
    const filename = urlFilename.includes(".")
      ? urlFilename
      : `image-${Date.now()}.${getExtensionFromMimeType(contentType)}`

    // Additional validation for SVG files
    if (contentType === "image/svg+xml") {
      const svgContent = buffer.toString("utf-8")
      const svgValidation = validateAndSanitizeSVG(svgContent)

      if (!svgValidation.isValid) {
        return {
          success: false,
          error: `SVG validation failed: ${svgValidation.error}`,
        }
      }

      // Use the sanitized SVG if available
      if (svgValidation.sanitized) {
        return {
          success: true,
          buffer: Buffer.from(svgValidation.sanitized, "utf-8"),
          contentType,
          filename,
          size,
        }
      }
    }

    return {
      success: true,
      buffer,
      contentType,
      filename,
      size,
    }
  } catch (error) {
    console.error("Error fetching image from URL:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred while fetching the image",
    }
  }
}

/**
 * Gets a file extension from a MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  }
  return mimeToExt[mimeType] || "jpg"
}

/**
 * Uploads an image from a URL to the media library
 */
export async function uploadImageFromUrl(
  url: string,
  metadata: {
    alt_text?: string
    category: string
    tags?: string[]
    uploaded_by?: string
  },
): Promise<MediaUploadResult> {
  try {
    // Special handling for Wikipedia SVG URLs
    if (url.includes("wikipedia.org") && url.includes("/File:") && url.endsWith(".svg")) {
      // Convert Wikipedia File: URL to actual image URL
      const parts = url.split("/File:")
      if (parts.length === 2) {
        const filename = parts[1]
        // Wikipedia stores SVGs in their media repository with specific URL pattern
        url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${filename.charAt(0).toLowerCase()}/${filename.substring(0, 2).toLowerCase()}/${filename}/800px-${filename}`
      }
    }

    // Fetch the image from the URL
    const fetchResult = await fetchImageFromUrl(url)

    if (!fetchResult.success) {
      return { success: false, error: fetchResult.error }
    }

    // Generate a unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = getExtensionFromMimeType(fetchResult.contentType!)
    const filename = `${timestamp}-${randomString}.${fileExtension}`

    // Upload to Blob storage
    const blobResult = await uploadToBlob({
      filename: `media/${filename}`,
      contentType: fetchResult.contentType!,
      data: fetchResult.buffer!,
    })

    if (!blobResult.success) {
      return { success: false, error: blobResult.error }
    }

    // Create thumbnail (in a real app, you would generate a proper thumbnail)
    // For now, we'll just use the same URL
    const thumbnailUrl = blobResult.url

    // Create the media asset record in the database
    const result = await createMediaAsset({
      filename,
      original_filename: fetchResult.filename!,
      file_size: fetchResult.size!,
      mime_type: fetchResult.contentType!,
      url: blobResult.url!,
      thumbnail_url: thumbnailUrl,
      alt_text: metadata.alt_text || "",
      category: metadata.category,
      tags: metadata.tags || [],
      uploaded_by: metadata.uploaded_by || "admin@example.com", // In a real app, this would be the current user
    })

    revalidatePath("/admin/media")
    return result
  } catch (error) {
    console.error("Error in uploadImageFromUrl:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}

/**
 * Validates a URL without fetching the image
 */
export async function validateImageUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Special handling for Wikipedia SVG URLs
    if (url.includes("wikipedia.org") && url.includes("/File:") && url.endsWith(".svg")) {
      // Convert Wikipedia File: URL to actual image URL for validation
      const parts = url.split("/File:")
      if (parts.length === 2) {
        const filename = parts[1]
        // Wikipedia stores SVGs in their media repository with specific URL pattern
        url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${filename.charAt(0).toLowerCase()}/${filename.substring(0, 2).toLowerCase()}/${filename}/800px-${filename}`
      }
    }

    // Validate URL format
    try {
      new URL(url)
    } catch (error) {
      return { valid: false, error: "Invalid URL format" }
    }

    // Attempt to fetch just the headers to check if the URL is accessible and is an image
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "StreamSignal Media Validator",
      },
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    })

    if (!response.ok) {
      return {
        valid: false,
        error: `Failed to access URL: HTTP ${response.status} ${response.statusText}`,
      }
    }

    // Check content type
    const contentType = response.headers.get("content-type")
    if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
      return {
        valid: false,
        error: `URL does not point to a supported image type. Detected: ${
          contentType || "unknown"
        }. Supported types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      }
    }

    // For SVG files, we need to do a full fetch to validate the content
    if (contentType === "image/svg+xml") {
      // For HEAD requests, we don't know if the SVG is valid until we fetch it
      // We could optionally do a full fetch here, but that may be expensive
      // Instead, we'll just indicate that it's a valid SVG format but needs further validation
      return {
        valid: true,
        error: "SVG format detected. The file will be validated for security when uploaded.",
      }
    }

    // Check file size if content-length header is available
    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10)
      if (size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `Image too large: ${(size / (1024 * 1024)).toFixed(2)}MB. Maximum size: ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        }
      }
    }

    return { valid: true }
  } catch (error) {
    console.error("Error validating image URL:", error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : "An unknown error occurred while validating the URL",
    }
  }
}
