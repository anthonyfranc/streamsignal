import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"
import { COOKIE_OPTIONS } from "@/utils/cookie-utils"

// Create a singleton instance of the Supabase client
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>({
      cookieOptions: COOKIE_OPTIONS,
    })
  }
  return supabaseClient
}

// Function to refresh the auth session
export async function refreshSession() {
  const supabase = getSupabaseClient()
  return await supabase.auth.refreshSession()
}

// Function to get the current session
export async function getSession() {
  const supabase = getSupabaseClient()
  return await supabase.auth.getSession()
}
