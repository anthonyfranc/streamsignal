import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Get the Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a Supabase client that works in both client and server components
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Create a singleton instance for reuse
let _supabaseServer: ReturnType<typeof getSupabase> | null = null

// Helper function to create a Supabase client for server components
export function getSupabase() {
  if (!_supabaseServer) {
    _supabaseServer = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }
  return _supabaseServer
}

// Helper function to check Supabase connection
// This works in both client and server components
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

export const supabaseServer = getSupabase()
