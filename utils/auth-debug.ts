import { createServerSupabaseClient } from "@/utils/supabase/server"

export async function debugAuthSession() {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Error getting session:", error)
      return {
        hasSession: false,
        error: error.message,
      }
    }

    if (!session) {
      return {
        hasSession: false,
        message: "No active session found",
      }
    }

    // Return session info without sensitive data
    return {
      hasSession: true,
      userId: session.user.id,
      email: session.user.email,
      hasMetadata: !!session.user.user_metadata,
      metadataKeys: Object.keys(session.user.user_metadata || {}),
      expiresAt: session.expires_at,
      lastActivity: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Exception in debugAuthSession:", error)
    return {
      hasSession: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
