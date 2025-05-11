import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { CookieOptions } from "@supabase/auth-helpers-shared"

// Standard cookie options that work across environments
export const COOKIE_OPTIONS: CookieOptions = {
  name: "sb-auth-token",
  lifetime: 60 * 60 * 24 * 7, // 1 week
  domain: "",
  path: "/",
  sameSite: "lax",
}

/**
 * Ensures authentication cookies are properly set
 * This helps fix issues where cookies aren't being transmitted to the server
 */
export async function ensureAuthCookies() {
  try {
    const supabase = createClientComponentClient()

    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      console.warn("No session found, cannot ensure auth cookies")
      return false
    }

    // Force refresh the session to ensure cookies are set correctly
    const { error } = await supabase.auth.refreshSession()

    if (error) {
      console.error("Error refreshing session:", error.message)
      return false
    }

    return true
  } catch (error) {
    console.error("Error ensuring auth cookies:", error)
    return false
  }
}

/**
 * Checks if authentication cookies are present
 */
export function checkAuthCookies() {
  // Check for Supabase auth cookies
  const hasSupabaseCookie = document.cookie.includes("sb-")

  return {
    hasAuthCookies: hasSupabaseCookie,
    cookieCount: document.cookie.split(";").filter((s) => s.trim()).length,
    cookies: document.cookie,
  }
}
