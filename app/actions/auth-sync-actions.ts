"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase-server"

/**
 * Server action to check authentication status
 * This helps synchronize client and server auth state
 */
export async function syncAuthState() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Log all available cookies for debugging
    const allCookies = cookieStore.getAll()
    const cookieNames = allCookies.map((c) => c.name)
    console.log("[SERVER] Available cookies in syncAuthState:", cookieNames)

    // Check for specific auth cookies
    const hasAuthCookie = cookieNames.some(
      (name) => name.includes("auth") || name.includes("supabase") || name.includes("sb-"),
    )
    console.log("[SERVER] Has auth cookies:", hasAuthCookie)

    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("[SERVER] Error getting session in syncAuthState:", error)
      return {
        authenticated: false,
        error: error.message,
        userId: null,
        cookies: cookieNames,
      }
    }

    if (!data.session) {
      console.log("[SERVER] No session found in syncAuthState")
      return {
        authenticated: false,
        error: "No session found",
        userId: null,
        cookies: cookieNames,
      }
    }

    // Session exists
    console.log("[SERVER] Valid session found in syncAuthState for user:", data.session.user.id)
    return {
      authenticated: true,
      userId: data.session.user.id,
      email: data.session.user.email,
      cookies: cookieNames,
    }
  } catch (error) {
    console.error("[SERVER] Exception in syncAuthState:", error)
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown error",
      userId: null,
    }
  }
}
