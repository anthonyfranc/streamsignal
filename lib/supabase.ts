import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Get environment variables with error checking
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not defined")
    // Return a placeholder to prevent runtime errors, but the client won't work
    return "https://placeholder-url.supabase.co"
  }
  return url
}

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
    // Return a placeholder to prevent runtime errors, but the client won't work
    return "placeholder-key"
  }
  return key
}

// Client-side singleton instance
let clientInstance: ReturnType<typeof createClient<Database>> | null = null

// Create a single supabase client for the browser
const createBrowserClient = () => {
  if (clientInstance) return clientInstance

  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  console.log("Creating new browser Supabase client instance")
  clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return clientInstance
}

// Server-side singleton instance for client components
let serverForClientInstance: ReturnType<typeof createClient<Database>> | null = null

// Create a server client for use in client components
const createServerForClientComponents = () => {
  if (serverForClientInstance) return serverForClientInstance

  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  console.log("Creating new server-for-client Supabase client instance")
  serverForClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serverForClientInstance
}

// Export the singleton instances
export const supabase = createBrowserClient()
export const supabaseServer = createServerForClientComponents()

// Helper function to check Supabase connection
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("channels").select("count").limit(1)

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
