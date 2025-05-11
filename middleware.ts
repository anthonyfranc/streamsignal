import { NextResponse, type NextRequest } from "next/server"
import { createMiddlewareClient } from "./lib/supabase-client-factory"

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
    // Create a Supabase client for the middleware
    const supabase = createMiddlewareClient(request, response)

    // This is critical: get the session and refresh it if needed
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If we have a session, refresh the user data
    // This will automatically update the auth cookies if needed
    if (session) {
      await supabase.auth.getUser()
    }

    // For debugging: add a custom header to indicate auth status
    response.headers.set("x-auth-status", session ? "authenticated" : "unauthenticated")

    // For protected routes, redirect to login if not authenticated
    const protectedRoutes = ["/admin", "/profile"]
    if (protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route)) && !session) {
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
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
    // Match all paths except for:
    // - API routes
    // - Static files (images, etc)
    // - Next.js internals
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
