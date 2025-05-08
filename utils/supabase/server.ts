import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { cookies } from "next/headers"

// Create a Supabase client for server components with cookie handling
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }

  if (!supabaseKey) {
    throw new Error(
      "Supabase key (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY) is required but not provided",
    )
  }

  // Get cookies for auth
  const cookieStore = cookies()

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      // Pass cookies to the Supabase client
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name, value, options) {
          // This won't be used in server components, but we need to provide it
          // Server components can't set cookies directly from here
        },
        remove(name, options) {
          // This won't be used in server components, but we need to provide it
          // Server components can't remove cookies directly from here
        },
      },
    },
  })
}

// Create a singleton instance for reuse
let _supabaseServer: ReturnType<typeof createServerSupabaseClient> | null = null

export function getServerSupabaseClient() {
  if (!_supabaseServer) {
    _supabaseServer = createServerSupabaseClient()
  }
  return _supabaseServer
}
