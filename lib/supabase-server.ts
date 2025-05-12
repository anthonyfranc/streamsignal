import { createClient } from "@supabase/supabase-js"

// Create a simple Supabase client for server components
export function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_ANON_KEY || "")
}
