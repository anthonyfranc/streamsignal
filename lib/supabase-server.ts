import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

// Create a Supabase client configured to use cookies for authentication.
export function createServerClient(cookieStore = cookies()) {
  // Ensure we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }

  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not provided")
  }

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        const cookie = cookieStore.get(name)
        return cookie?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // This will throw in Server Components because they cannot set cookies directly
          // The middleware will handle setting cookies instead
          console.error("Error setting cookie:", error)
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.delete({ name, ...options })
        } catch (error) {
          // This will throw in Server Components
          console.error("Error removing cookie:", error)
        }
      },
    },
  })
}

// For convenience in server components that don't need cookie handling
export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }

  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not provided")
  }

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
  })
}

// Export a pre-initialized server-side client for convenience
export const supabaseServer = getSupabase()
