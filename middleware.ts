import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Skip cache headers for API routes and static files
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.includes(".") ||
    request.nextUrl.pathname.startsWith("/_next")
  ) {
    return response
  }

  // Different cache strategies for different routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Admin pages should not be cached
    response.headers.set("Cache-Control", "no-store, max-age=0")
  } else if (request.nextUrl.pathname.match(/^\/(channels|services)\/[^/]+$/)) {
    // Detail pages - moderate caching with background revalidation
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
    response.headers.set("Surrogate-Control", "public, max-age=60, stale-while-revalidate=300")
  } else if (request.nextUrl.pathname === "/channels" || request.nextUrl.pathname === "/services") {
    // Directory pages - longer caching with background revalidation
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
    response.headers.set("Surrogate-Control", "public, max-age=300, stale-while-revalidate=600")
  } else if (request.nextUrl.pathname === "/") {
    // Homepage - similar to directories
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
    response.headers.set("Surrogate-Control", "public, max-age=300, stale-while-revalidate=600")
  } else if (request.nextUrl.pathname.startsWith("/recommendations")) {
    // Recommendations - personalized, so don't cache
    response.headers.set("Cache-Control", "no-store, max-age=0")
  } else {
    // Default caching strategy
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
    response.headers.set("Surrogate-Control", "public, max-age=60, stale-while-revalidate=300")
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
