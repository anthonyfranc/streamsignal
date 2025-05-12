/**
 * Utility functions for safely handling data
 */

/**
 * Safely convert any value to a string
 * @param value Any value that needs to be converted to a string
 * @param defaultValue Default value to return if conversion fails
 * @returns A string representation of the value or the default value
 */
export function safeString(value: any, defaultValue = ""): string {
  if (value === null || value === undefined) return defaultValue

  try {
    // Handle different types appropriately
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    if (typeof value === "object") {
      // Try to convert objects to JSON strings, but handle circular references
      try {
        return JSON.stringify(value)
      } catch (e) {
        return defaultValue
      }
    }

    // For any other type, try to convert to string
    return String(value)
  } catch (error) {
    console.error("Error converting value to string:", error)
    return defaultValue
  }
}

/**
 * Safely get initials from a name
 * @param name The name to get initials from
 * @returns The initials (up to 2 characters)
 */
export function safeInitials(name: any): string {
  const nameStr = safeString(name, "Anonymous")

  if (!nameStr || nameStr.trim() === "") return "AN"

  try {
    const parts = nameStr.trim().split(/\s+/)

    if (parts.length === 0) return "AN"
    if (parts.length === 1) {
      return (parts[0].charAt(0) || "A").toUpperCase()
    }

    return ((parts[0].charAt(0) || "A") + (parts[parts.length - 1].charAt(0) || "N")).toUpperCase()
  } catch (error) {
    console.error("Error getting initials:", error)
    return "AN"
  }
}

/**
 * Safely format a date
 * @param dateString The date string to format
 * @param formatter Function to format the date
 * @returns The formatted date string or a fallback
 */
export function safeFormatDate(dateString: any, formatter: (date: Date) => string, fallback = "recently"): string {
  if (!dateString) return fallback

  try {
    const date = new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) return fallback

    return formatter(date)
  } catch (error) {
    console.error("Error formatting date:", error)
    return fallback
  }
}

/**
 * Safely parse a number from any value
 * @param value The value to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns The parsed number or the default value
 */
export function safeNumber(value: any, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue

  try {
    if (typeof value === "number") return value
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value)
      return isNaN(parsed) ? defaultValue : parsed
    }
    return defaultValue
  } catch (error) {
    console.error("Error parsing number:", error)
    return defaultValue
  }
}

/**
 * Safely access a property from an object
 * @param obj The object to access
 * @param path The property path (e.g., "user.profile.name")
 * @param defaultValue Default value to return if property doesn't exist
 * @returns The property value or the default value
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  if (!obj) return defaultValue

  try {
    const parts = path.split(".")
    let current = obj

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return defaultValue
      }
      current = current[part]
    }

    return current === undefined || current === null ? defaultValue : (current as T)
  } catch (error) {
    console.error("Error accessing property:", error)
    return defaultValue
  }
}
