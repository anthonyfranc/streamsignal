import { createClient } from "@supabase/supabase-js"
import { cache } from "react"

// Create a single supabase client for the entire application
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      persistSession: true,
      storageKey: "streamsignal_auth_token",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

// Create a single supabase client for the browser
const createBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables for browser client:", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    })
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "streamsignal_auth_token",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

// Create a single supabase client for server components
const createServerClient = () => {
  // Use NEXT_PUBLIC_SUPABASE_URL instead of SUPABASE_URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  // Use SUPABASE_SERVICE_ROLE_KEY if available, otherwise fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables for server client:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// For client components
export const supabaseBrowser = createBrowserClient()

// For server components
export const supabaseServer = createServerClient()

// Cached version of getSession to prevent multiple calls
export const getSession = cache(async () => {
  const { data, error } = await supabaseBrowser.auth.getSession()
  if (error) {
    console.error("Error getting session:", error.message)
    return { session: null }
  }
  return data
})

// Helper function to check Supabase connection
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabaseServer.from("channels").select("count").limit(1)

    if (error) {
      console.error("Supabase connection test failed:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Exception testing Supabase connection:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error testing connection",
    }
  }
}
