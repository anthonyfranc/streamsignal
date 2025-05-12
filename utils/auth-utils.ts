/**
 * Retrieves the authentication token from local storage
 * This function should only be called on the client side
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  // Try to get the token from the primary location
  let token = localStorage.getItem("sb-ajstedtpecdgpabjibdd-auth-token")

  // If not found, try the alternative location
  if (!token) {
    try {
      const supabaseAuth = localStorage.getItem("supabase.auth.token")
      if (supabaseAuth) {
        const parsedAuth = JSON.parse(supabaseAuth)
        token = parsedAuth?.currentSession?.access_token || null
      }
    } catch (error) {
      console.error("Error parsing supabase auth token:", error)
    }
  }

  return token
}

/**
 * Checks if the user is authenticated based on local storage tokens
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}
