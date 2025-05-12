"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

// Create a single supabase browser client for the entire client-side application
let browserClient: ReturnType<typeof createClientComponentClient<Database>> | undefined

export function createBrowserClient() {
  if (browserClient) return browserClient

  browserClient = createClientComponentClient<Database>()
  return browserClient
}
