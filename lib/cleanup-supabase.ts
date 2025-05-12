"use client"

import { useEffect } from "react"

// This component helps clean up any stray Supabase clients
// by removing their storage keys when the app loads
export function CleanupSupabaseClients() {
  useEffect(() => {
    // Find and clean up any supabase-related localStorage items
    // except for the one used by our singleton
    const keys = Object.keys(localStorage)
    const supabaseKeys = keys.filter(
      (key) => key.startsWith("supabase.auth.token") && !key.includes("default"), // Keep the default one
    )

    // Remove any duplicate keys
    supabaseKeys.forEach((key) => {
      localStorage.removeItem(key)
    })
  }, [])

  return null
}
