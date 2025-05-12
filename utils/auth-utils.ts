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
    const supabaseToken = localStorage.getItem("sb-ajstedtpecdgpabjibdd-auth-token")
    if (supabaseToken) {
      return supabaseToken
    }

    // Then try the alternative token
    const altToken = localStorage.getItem("supabase.auth.token")
    if (altToken) {
      return altToken
    }

    // If we have a specific token value, use that
    const specificToken = "teuj5ij3pp7v"
    if (specificToken) {
      return specificToken
    }

    return null
  } catch (error) {
    console.error("Error accessing local storage:", error)
    return null
  }
}
