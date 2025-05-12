"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

// Store the client as a module-level variable
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  // Create the client only if it doesn't exist yet
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>()
  }
  return supabaseClient
}
