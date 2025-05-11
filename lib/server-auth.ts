import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

/**
 * Gets the current authenticated user from the server
 * This is the ONLY reliable way to get the user on the server
 */
export async function getServerUser() {
  try {
    // Get the cookie store
    const cookieStore = cookies()

    // Debug: Log all available cookies (names only for security)
    const allCookies = cookieStore.getAll().map((c) => c.name)
    console.log("Available cookies in getServerUser:", allCookies)

    // Check specifically for Supabase auth cookie
    const authCookie = cookieStore.get("sb-" + process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF + "-auth-token")
    console.log("Auth cookie present:", !!authCookie)

    // Create a properly configured Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)
            console.log(`Cookie requested: ${name}, found: ${!!cookie}`)
            return cookie?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
              console.log(`Cookie set: ${name}`)
            } catch (error) {
              // Expected error in Server Components
              console.log(`Cannot set cookie in Server Component: ${name}`)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete({ name, ...options })
              console.log(`Cookie removed: ${name}`)
            } catch (error) {
              // Expected error in Server Components
              console.log(`Cannot delete cookie in Server Component: ${name}`)
            }
          },
        },
      },
    )

    // Use getUser() to validate the token
    console.log("Calling supabase.auth.getUser()...")
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    console.log("User retrieved successfully:", !!data.user)
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
  console.log("Starting verifyServerAuth...")
  const { user, error } = await getServerUser()

  if (error) {
    console.error("Auth verification error:", error)
    return null
  }

  if (!user) {
    console.log("No authenticated user found")
    return null
  }

  console.log("User authenticated:", user.id.substring(0, 8) + "...")
  return user.id
}
