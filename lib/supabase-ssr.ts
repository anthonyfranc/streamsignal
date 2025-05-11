import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  // Check if environment variables are available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error("Supabase environment variables are missing")
    throw new Error("Supabase configuration is incomplete. Check environment variables.")
  }

  // Use SUPABASE_ANON_KEY for server-side operations (more secure than NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    return createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          const value = cookie?.value
          return value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // This can happen when attempting to set cookies in middleware
            console.error(`Error setting cookie ${name}:`, error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch (error) {
            console.error(`Error removing cookie ${name}:`, error)
          }
        },
      },
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw error
  }
}

// Helper function to get the current user on the server
export async function getServerUser() {
  try {
    const supabase = createServerSupabaseClient()

    // First check the session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Error getting server session:", sessionError.message)
      return { user: null, error: sessionError, session: null }
    }

    if (!sessionData.session) {
      console.log("No active session found")
      return { user: null, error: null, session: null }
    }

    // If we have a session, get the user
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error("Error getting server user:", userError.message)
      return { user: null, error: userError, session: sessionData.session }
    }

    return {
      user: userData.user,
      error: null,
      session: sessionData.session,
    }
  } catch (err) {
    console.error("Exception in getServerUser:", err)
    return { user: null, error: err, session: null }
  }
}

// Verifies if a user is authenticated on the server
export async function verifyServerAuth() {
  try {
    const { user, error, session } = await getServerUser()

    if (error) {
      console.error("Auth verification error:", error)
      return null
    }

    if (!session) {
      console.log("Auth session missing!")
      return null
    }

    if (!user) {
      console.log("Auth user missing despite valid session!")
      return null
    }

    return user.id
  } catch (error) {
    console.error("Exception in verifyServerAuth:", error)
    return null
  }
}
