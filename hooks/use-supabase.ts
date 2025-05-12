"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-singleton"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// This hook ensures we're always using the singleton Supabase client
export function useSupabase() {
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null)

  useEffect(() => {
    // Only set the client on the client-side
    setClient(getSupabaseBrowserClient())
  }, [])

  return client
}
