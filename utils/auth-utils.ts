/**
 * Utility function to get the authentication token from local storage
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  // Try to get the token from local storage
  try {
    // First try the standard Supabase token
    const supabaseTokenStr = localStorage.getItem("sb-ajstedtpecdgpabjibdd-auth-token")
    if (supabaseTokenStr) {
      try {
        // Parse the token to get the access token
        const parsedToken = JSON.parse(supabaseTokenStr)
        return parsedToken?.access_token || null
      } catch (e) {
        console.error("Error parsing Supabase token:", e)
      }
    }

    // Then try the alternative token format
    const altToken = localStorage.getItem("supabase.auth.token")
    if (altToken) {
      try {
        const parsedAuth = JSON.parse(altToken)
        return parsedAuth?.currentSession?.access_token || null
      } catch (e) {
        console.error("Error parsing alternative auth token:", e)
      }
    }

    return null
  } catch (error) {
    console.error("Error accessing local storage:", error)
    return null
  }
}

/**
 * Validates if the current user is authenticated by checking both the session and token
 * @returns A promise that resolves to a boolean indicating if the user is authenticated
 */
export async function validateAuthentication(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false
  }

  try {
    // Try to get the session from Supabase
    const { data } = await import("@/lib/supabase").then((m) => m.supabase.auth.getSession())

    // If we have a valid session, return true
    if (data.session) {
      return true
    }

    // Otherwise, check if we have a valid token
    const token = getAuthToken()
    if (!token) {
      return false
    }

    // Try to validate the token by setting the session
    const { error } = await import("@/lib/supabase").then((m) =>
      m.supabase.auth.setSession({ access_token: token, refresh_token: "" }),
    )

    return !error
  } catch (error) {
    console.error("Error validating authentication:", error)
    return false
  }
}
