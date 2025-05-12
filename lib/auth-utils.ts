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

export function getUserDisplayName(user: any): string {
  if (!user) return "Anonymous"

  // Try to get the name from different possible locations
  const fullName =
    user.user_metadata?.full_name || user.user_metadata?.name || user.profile?.full_name || user.profile?.name

  if (fullName) return fullName

  // If no name is found, try to use the email
  const email = user.email
  if (email) {
    // Return the part before the @ symbol
    return email.split("@")[0]
  }

  // If all else fails, return the user ID truncated
  return user.id ? `User ${user.id.substring(0, 6)}` : "Anonymous"
}
