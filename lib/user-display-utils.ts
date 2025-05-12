import { createClient } from "@/lib/supabase-server"
import type { User } from "@supabase/supabase-js"

export type UserDisplayInfo = {
  displayName: string
  avatarUrl: string | null
}

/**
 * Gets a user's display information from user_profiles or auth metadata
 */
export async function getUserDisplayInfo(userId: string): Promise<UserDisplayInfo> {
  const supabase = createClient()

  // Try to get from user_profiles first
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", userId)
    .single()

  if (userProfile?.display_name) {
    return {
      displayName: userProfile.display_name,
      avatarUrl: userProfile.avatar_url,
    }
  }

  // Fall back to auth metadata
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  const user = userData?.user

  if (user) {
    const name = getUserNameFromMetadata(user)
    return {
      displayName: name,
      avatarUrl: null,
    }
  }

  // Last resort fallback
  return {
    displayName: "Anonymous User",
    avatarUrl: null,
  }
}

/**
 * Extract user name from auth metadata
 */
function getUserNameFromMetadata(user: User): string {
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }

  if (user.user_metadata?.name) {
    return user.user_metadata.name
  }

  // If we have first and last name
  const firstName = user.user_metadata?.first_name
  const lastName = user.user_metadata?.last_name

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  if (firstName) {
    return firstName
  }

  // Last resort, use email or phone
  return user.email?.split("@")[0] || "User"
}

/**
 * Client-side version for getting display name from user object
 */
export function getDisplayNameFromUser(user: User | null): string {
  if (!user) return "Anonymous"

  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }

  if (user.user_metadata?.name) {
    return user.user_metadata.name
  }

  const firstName = user.user_metadata?.first_name
  const lastName = user.user_metadata?.last_name

  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }

  if (firstName) {
    return firstName
  }

  return user.email?.split("@")[0] || "User"
}
