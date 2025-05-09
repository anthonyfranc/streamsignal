"use client"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Ensure environment variables are available and provide better error messages
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

// Create a single supabase client for the browser
const createBrowserClient = () => {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

// For client components
export const supabase = createBrowserClient()

// Helper function to check Supabase connection
// This is a safe version that doesn't use the service role key
export async function checkSupabaseConnection() {
  try {
    // Use the regular client with anon key to check connection
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

// Create a singleton instance for reuse
let _supabaseServer: ReturnType<typeof createBrowserClient> | null = null

export function getServerSupabaseClient() {
  if (!_supabaseServer) {
    _supabaseServer = createBrowserClient()
  }
  return _supabaseServer
}

export const supabaseServer = getServerSupabaseClient()
