/**
 * Utility functions for displaying user information
 */

/**
 * Get initials from a display name
 * @param displayName The user's display name
 * @returns The initials (up to 2 characters)
 */
export function getInitials(displayName: string | null | undefined): string {
  if (!displayName) return "?"

  try {
    const names = displayName.split(" ")
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase()
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  } catch (error) {
    console.error("Error getting initials:", error)
    return "?"
  }
}

/**
 * Get a color based on the user's ID for consistent avatar colors
 * @param userId The user's ID
 * @returns A CSS color string
 */
export function getUserColor(userId: string | null | undefined): string {
  if (!userId) return "#6366f1" // Default indigo color

  // Generate a consistent color based on the user ID
  const colors = [
    "#f43f5e", // rose
    "#ec4899", // pink
    "#d946ef", // fuchsia
    "#a855f7", // purple
    "#8b5cf6", // violet
    "#6366f1", // indigo
    "#3b82f6", // blue
    "#0ea5e9", // sky
    "#06b6d4", // cyan
    "#14b8a6", // teal
    "#10b981", // emerald
    "#22c55e", // green
    "#84cc16", // lime
    "#eab308", // yellow
    "#f59e0b", // amber
    "#f97316", // orange
    "#ef4444", // red
  ]

  // Use the sum of character codes to pick a color
  try {
    const sum = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[sum % colors.length]
  } catch (error) {
    console.error("Error getting user color:", error)
    return "#6366f1" // Default indigo color
  }
}

/**
 * Format a timestamp into a human-readable format
 * @param timestamp The timestamp to format
 * @returns A formatted string like "2 hours ago"
 */
export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return "Unknown time"

  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) {
      return "just now"
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`
    } else {
      return date.toLocaleDateString()
    }
  } catch (error) {
    console.error("Error formatting timestamp:", error)
    return "Unknown time"
  }
}
