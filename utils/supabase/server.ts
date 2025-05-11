import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Simple function to create a Supabase client for server components
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

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
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
