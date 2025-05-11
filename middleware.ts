import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip auth handling for certain paths
  if (
    request.nextUrl.pathname.startsWith("/api/auth-callback") ||
    request.nextUrl.pathname.includes(".") ||
    request.nextUrl.pathname.startsWith("/_next")
  ) {
    return response
  }

  try {
    // Create a Supabase client for the middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Set cookies in the response
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            response.cookies.delete({
              name,
              ...options,
            })
          },
        },
      },
    )

    // First check if we have a session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If we have a session, try to refresh it
    if (session) {
      await supabase.auth.getUser()
      // The above call will automatically refresh the session if needed
      // and update cookies via the set() function we provided
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
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
