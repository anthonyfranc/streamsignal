import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

/**
 * Gets the current authenticated user from the server
 * This is the ONLY reliable way to get the user on the server
 */
export async function getServerUser() {
  try {
    const cookieStore = cookies()

    // Create a properly configured Supabase client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Expected error in Server Components
              console.debug("Cannot set cookie in Server Component - this is normal")
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete({ name, ...options })
            } catch (error) {
              // Expected error in Server Components
              console.debug("Cannot delete cookie in Server Component - this is normal")
            }
          },
        },
      },
    )

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
}

/**
 * Verifies if a user is authenticated on the server
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyServerAuth() {
  const { user, error } = await getServerUser()

  if (error || !user) {
    return null
  }

  return user.id
}
