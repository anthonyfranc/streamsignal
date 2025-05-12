import { supabase } from "@/lib/supabase"

export async function getCurrentUser() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Error getting session:", error)
      return null
    }

    if (!session) {
      return null
    }

    return session.user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export async function getUserDisplayName(user: any): Promise<string> {
  if (!user) return "Anonymous"

  try {
    // First try to get the display name from user_profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()

    if (!profileError && userProfile && userProfile.display_name) {
      return userProfile.display_name
    }

    // If no profile or no display name, try to get the name from user metadata
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username

    if (fullName) return fullName

    // If no name is found, try to use the email
    const email = user.email
    if (email) {
      // Return the part before the @ symbol
      return email.split("@")[0]
    }

    // If all else fails, return the user ID truncated
    return user.id ? `User ${user.id.substring(0, 6)}` : "Anonymous"
  } catch (error) {
    console.error("Error getting user display name:", error)
    return user.id ? `User ${user.id.substring(0, 6)}` : "Anonymous"
  }
}

// Synchronous version for when we already have the profile data
export function getDisplayNameFromData(user: any, userProfile: any): string {
  if (!user) return "Anonymous"

  // First try to get the display name from user_profiles
  if (userProfile && userProfile.display_name) {
    return userProfile.display_name
  }

  // If no profile or no display name, try to get the name from user metadata
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username

  if (fullName) return fullName

  // If no name is found, try to use the email
  const email = user.email
  if (email && typeof email === "string") {
    // Return the part before the @ symbol
    return email.split("@")[0]
  }

  // If all else fails, return the user ID truncated
  return user.id ? `User ${user.id.substring(0, 6)}` : "Anonymous"
}
