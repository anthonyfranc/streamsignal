import { createServerComponentClient } from "./supabase-client-factory"
import { cache } from "react"

// Use React cache to prevent multiple calls to getServerUser within the same render cycle
export const getServerUser = cache(async () => {
  try {
    const supabase = createServerComponentClient()

    // Use getUser() to validate the token
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (err) {
    console.error("Exception in getServerUser:", err)
    return { user: null, error: err }
  }
})

/**
 * Verifies if a user is authenticated on the server
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyServerAuth() {
  const { user, error } = await getServerUser()

  if (error) {
    console.error("Auth verification error:", error)
    return null
  }

  if (!user) {
    console.log("No authenticated user found")
    return null
  }

  return user.id
}

/**
 * Gets the user's profile data
 * Returns the profile data if available, null otherwise
 */
export async function getUserProfile(userId: string) {
  try {
    const supabase = createServerComponentClient()

    const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error getting user profile:", error.message)
      return null
    }

    return data
  } catch (err) {
    console.error("Exception in getUserProfile:", err)
    return null
  }
}
