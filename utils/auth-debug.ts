"use client"

import { useEffect } from "react"
import { supabaseBrowser } from "@/lib/supabase-client"

export function useAuthDebug() {
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check localStorage
        const keys = Object.keys(localStorage)
        const authKeys = keys.filter((key) => key.includes("auth") || key.includes("supabase") || key.startsWith("sb-"))

        console.log("Auth-related localStorage keys:", authKeys)

        // Check current session
        const { data, error } = await supabaseBrowser.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
        } else {
          console.log("Current session:", data.session ? "Active" : "None")
          if (data.session) {
            console.log("Session expires at:", new Date(data.session.expires_at * 1000).toLocaleString())
            console.log("User ID:", data.session.user.id)
          }
        }
      } catch (e) {
        console.error("Auth debug error:", e)
      }
    }

    checkAuth()
  }, [])

  return null
}
