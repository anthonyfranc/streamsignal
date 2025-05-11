import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getServerUser } from "@/lib/server-auth"

// Try to import cookies safely
let cookiesFunction: any
try {
  const { cookies } = require("next/headers")
  cookiesFunction = cookies
} catch (e) {
  // Mock implementation if import fails
  cookiesFunction = () => ({
    getAll: () => [],
    get: () => null,
  })
}

export async function GET(request: Request) {
  try {
    console.log("Auth debug endpoint called")

    // Try to get cookies safely
    let allCookies = []
    try {
      const cookieStore = cookiesFunction()
      allCookies = cookieStore.getAll().map((c: any) => ({
        name: c.name,
        value: c.value.substring(0, 5) + "...",
      }))
    } catch (e) {
      console.log("Could not access cookies via next/headers")
    }

    // Check auth state using our getServerUser function
    console.log("Calling getServerUser...")
    const { user, error } = await getServerUser()
    console.log("getServerUser result:", !!user, error?.message)

    // Create a Supabase client that doesn't rely on cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // This is a fallback that will work at build time
            // but won't actually get cookies
            return null
          },
          set(name: string, value: string, options: any) {
            // No-op
          },
          remove(name: string, options: any) {
            // No-op
          },
        },
      },
    )

    // Get user data directly
    console.log("Calling direct getUser...")
    const { data: userData, error: userError } = await supabase.auth.getUser()

    // Get session data directly
    console.log("Calling direct getSession...")
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id ? user.id.substring(0, 8) + "..." : null,
      error: error ? error.message : null,
      cookieCount: allCookies.length,
      cookies: allCookies,
      directCheck: {
        userPresent: !!userData?.user,
        sessionPresent: !!sessionData?.session,
        userError: userError?.message,
        sessionError: sessionError?.message,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Auth debug error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
