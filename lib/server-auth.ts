import { createServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

/**
 * Gets the current authenticated user from the server
 * This is the ONLY reliable way to get the user on the server
 * According to Supabase docs, getSession() is not reliable in Server Components
 */
export async function getServerUser() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Use getUser() instead of getSession() as per Supabase documentation
    // getUser() sends a request to the Supabase Auth server every time to revalidate the Auth token
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    // Log token expiration information for debugging
    if (data.user) {
      const exp = data.user.exp || 0
      const now = Math.floor(Date.now() / 1000)
      const isExpired = exp < now
      const expiresIn = exp - now

      console.log(`Auth token status: ${isExpired ? "EXPIRED" : "VALID"}, expires in ${expiresIn}s`)

      if (isExpired) {
        console.error(`Auth token expired ${Math.abs(expiresIn)}s ago`)
        return { user: null, error: new Error("Token expired") }
      }
    }

    return { user: data.user, error: null }
  } catch (err) {
    console.error("Exception in getServerUser:", err)
    return { user: null, error: err }
  }
}

/**
 * Verifies if a user is authenticated on the server
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyServerAuth() {
  const { user, error } = await getServerUser()

  if (error) {
    console.error("Auth verification failed:", error.message)
    return null
  }

  if (!user) {
    console.warn("No user found in verifyServerAuth")
    return null
  }

  return user.id
}
