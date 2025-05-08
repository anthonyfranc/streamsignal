import { createClient } from "@supabase/supabase-js"
import type { cookies } from "next/headers"
import type { Database } from "@/types/database"

// Server-side singleton instance (without cookies)
let serverClientInstance: ReturnType<typeof createClient<Database>> | null = null

// Get environment variables with error checking
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not defined")
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }
  return url
}

const getSupabaseKey = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceKey || anonKey

  if (!key) {
    console.error("Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is defined")
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not provided")
  }

  return key
}

// Create a Supabase client configured to use cookies for authentication.
export function createServerClient(cookieStore?: ReturnType<typeof cookies>) {
  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseKey()

  // If cookieStore is provided, we need a new instance with those cookies
  // We can't reuse the singleton in this case
  if (cookieStore) {
    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Don't persist session in server environment
        autoRefreshToken: false, // Don't auto refresh in server environment
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error("Error setting cookie:", error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (error) {
            console.error("Error removing cookie:", error)
          }
        },
      },
    })
  }

  // For requests without cookieStore, use the singleton
  if (!serverClientInstance) {
    console.log("Creating new server Supabase client instance")
    serverClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Don't persist session in server environment
        autoRefreshToken: false, // Don't auto refresh in server environment
      },
    })
  }

  return serverClientInstance
}

// Create a simple Supabase client for server components
// This maintains backward compatibility with existing code
export function getSupabase() {
  return createServerClient()
}
