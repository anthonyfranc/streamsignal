import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { parseCookies, setCookies } from "@/lib/request-cookies"

export async function middleware(request: NextRequest) {
  // Create a response object
  const response = NextResponse.next()

  // Parse and store cookies from the request
  const cookieHeader = request.headers.get("cookie") || ""
  const cookies = parseCookies(cookieHeader)
  setCookies(cookies)

  // Skip auth handling for certain paths
  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.includes(".") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/pages/")
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
            const value = request.cookies.get(name)?.value
            return value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
              httpOnly: false,
              sameSite: "lax",
              path: "/",
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

    // Check for session and refresh if needed
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      await supabase.auth.getUser()
      response.headers.set("x-auth-status", "authenticated")
    } else {
      response.headers.set("x-auth-status", "unauthenticated")
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
  }

  // Cache control headers
  if (request.nextUrl.pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "no-store, max-age=0")
  } else if (request.nextUrl.pathname.match(/^\/(channels|services)\/[^/]+$/)) {
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  } else if (request.nextUrl.pathname === "/channels" || request.nextUrl.pathname === "/services") {
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
  } else if (request.nextUrl.pathname === "/") {
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
  } else if (request.nextUrl.pathname.startsWith("/recommendations")) {
    response.headers.set("Cache-Control", "no-store, max-age=0")
  } else {
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  }

  return response
}

// Configure middleware to exclude Pages Router paths
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
