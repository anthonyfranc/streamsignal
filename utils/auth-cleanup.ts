"use client"

import { useEffect } from "react"

export function useAuthCleanup() {
  useEffect(() => {
    // This effect runs once when the app loads
    try {
      // Get the default Supabase token key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) return

      const defaultKey = "sb-" + supabaseUrl.split("//")[1].split(".")[0] + "-auth-token"

      // Check if we have the default token
      const hasDefaultToken = localStorage.getItem(defaultKey) !== null

      if (hasDefaultToken) {
        // If we have the default token, remove any other tokens
        const keysToRemove = ["none"]

        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key)
          } catch (e) {
            console.error(`Error removing ${key}:`, e)
          }
        })

        console.log("Auth storage cleaned up")
      }
    } catch (e) {
      console.error("Error during auth cleanup:", e)
    }
  }, [])

  return null
}
