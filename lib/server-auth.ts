import { createServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

/**
 * Gets the current user session from the server
 * This is a more reliable way to get the session than using the client-side auth
 */
export async function getServerSession() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Error getting server session:", error.message)
      return { session: null, error }
    }

    return { session: data.session, error: null }
  } catch (err) {
    console.error("Exception in getServerSession:", err)
    return { session: null, error: err }
  }
}

/**
 * Verifies if a user is authenticated on the server
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyServerAuth() {
  const { session, error } = await getServerSession()

  if (error || !session) {
    return null
  }

  return session.user.id
}
