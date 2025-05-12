import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Simple function to create a Supabase client for server components
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
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
