/**
 * Adds a cache-busting parameter to an image URL
 * @param url The original image URL
 * @returns The URL with a cache-busting parameter
 */
export function getCacheBustedImageUrl(url: string | null): string {
  if (!url) return "/placeholder.svg"

  // Add a timestamp as a query parameter to bust the cache
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${Date.now()}`
}
