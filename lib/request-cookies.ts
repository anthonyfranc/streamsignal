// This is a simplified approach that doesn't use next/headers
// It's not as robust as the cookies() function from next/headers
// but it will work in both App Router and Pages Router

let requestCookies: Record<string, string> | null = null

// This should be called early in the request lifecycle
// For example, in middleware
export function setCookies(cookies: Record<string, string>) {
  requestCookies = cookies
}

export function getCookies() {
  return requestCookies || {}
}

// Parse cookies from a cookie header
export function parseCookies(cookieHeader: string) {
  const cookies: Record<string, string> = {}

  if (!cookieHeader) return cookies

  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=")
    if (parts.length >= 2) {
      const name = parts[0].trim()
      const value = parts.slice(1).join("=").trim()
      cookies[name] = value
    }
  })

  return cookies
}
