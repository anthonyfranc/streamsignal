import { createClient } from "@supabase/supabase-js"
import { cache } from "react"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables")
  throw new Error("Missing Supabase environment variables")
}

// Create a single supabase client for browser-side usage with consistent storage key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    // Use the default Supabase storage key to avoid conflicts
    // This is the key that Supabase uses by default
    storageKey: "sb-" + supabaseUrl.split("//")[1].split(".")[0] + "-auth-token",
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// For consistency with our auth context
export const supabaseBrowser = supabase

// Create a single supabase client for server components
const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables for server client")
    throw new Error("Missing Supabase environment variables for server client")
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

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
