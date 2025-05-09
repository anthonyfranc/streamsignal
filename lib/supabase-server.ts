import { createClient } from "@supabase/supabase-js"
import type { cookies } from "next/headers"
import type { Database } from "@/types/database"

// Create a Supabase client configured to use cookies for authentication.
export function createServerClient(cookieStore?: ReturnType<typeof cookies>) {
  // Ensure we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }

  if (!supabaseKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not provided")
  }

  // If cookieStore is provided, use it for authentication
  if (cookieStore) {
    return createClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          return cookie?.value
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
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }

  // Otherwise, create a client without cookie handling
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

// Create a simple Supabase client for server components
// This maintains backward compatibility with existing code
export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }

  if (!supabaseKey) {
    throw new Error("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not provided")
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Export a pre-initialized server-side client for convenience
export const supabaseServer = getSupabase()
