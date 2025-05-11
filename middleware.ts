import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  // Create a response object
  const response = NextResponse.next()

  // Skip auth handling for certain paths
  if (
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.includes(".") ||
    request.nextUrl.pathname.startsWith("/_next")
  ) {
    return response
  }

  try {
    console.log("Middleware processing request:", request.nextUrl.pathname)

    // Debug: Log cookies from request
    const cookieHeader = request.headers.get("cookie") || ""
    console.log("Cookie header present:", !!cookieHeader)

    // Create a Supabase client for the middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = request.cookies.get(name)?.value
            console.log(`Middleware cookie get: ${name}, found: ${!!value}`)
            return value
          },
          set(name: string, value: string, options: any) {
            // This is the crucial part - we're setting cookies in the response
            console.log(`Middleware setting cookie: ${name}`)
            response.cookies.set({
              name,
              value,
              ...options,
              // Ensure cookies are accessible to both client and server
              httpOnly: false,
              sameSite: "lax",
              path: "/",
            })
          },
          remove(name: string, options: any) {
            console.log(`Middleware removing cookie: ${name}`)
            response.cookies.delete({
              name,
              ...options,
            })
          },
        },
      },
    )

    // First check if we have a session
    console.log("Checking for existing session...")
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If we have a session, try to refresh it
    if (session) {
      console.log("Session found, refreshing user data...")
      await supabase.auth.getUser()
      // The above call will automatically refresh the session if needed
      // and update cookies via the set() function we provided

      // Add a custom header to indicate auth status
      response.headers.set("x-auth-status", "authenticated")
    } else {
      console.log("No session found in middleware")
      response.headers.set("x-auth-status", "unauthenticated")
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    // Don't block the request if auth fails, just log the error
  }

  // Different cache strategies for different routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Admin pages should not be cached
    response.headers.set("Cache-Control", "no-store, max-age=0")
  } else if (request.nextUrl.pathname.match(/^\/(channels|services)\/[^/]+$/)) {
    // Detail pages - moderate caching with background revalidation
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  } else if (request.nextUrl.pathname === "/channels" || request.nextUrl.pathname === "/services") {
    // Directory pages - longer caching with background revalidation
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
  } else if (request.nextUrl.pathname === "/") {
    // Homepage - similar to directories
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
  } else if (request.nextUrl.pathname.startsWith("/recommendations")) {
    // Recommendations - personalized, so don't cache
    response.headers.set("Cache-Control", "no-store, max-age=0")
  } else {
    // Default caching strategy
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  }

  return response
}

// Configure which paths should be processed by this middleware
export const config = {
  matcher: [
    // Match all App Router paths except for:
    // - API routes
    // - Static files (images, etc)
    // - Next.js internals
    // - Pages Router routes
    "/((?!api|_next/static|_next/image|favicon.ico|pages/).*)",
  ],
}
