import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // This is needed to set cookies from the middleware
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // This is needed to delete cookies from the middleware
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    },
  )

  // This will refresh the session if needed
  await supabase.auth.getSession()

  return response
}

// Only run the middleware on auth-related paths and API routes
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match all server actions (which use API routes under the hood)
    "/actions/:path*",
    // Match specific auth-required pages
    "/admin/:path*",
    "/services/:path*/review",
  ],
}
