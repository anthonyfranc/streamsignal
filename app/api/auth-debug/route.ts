import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@/lib/supabase-client-factory"
import { getServerUser } from "@/lib/server-auth"

export async function GET() {
  try {
    // Get all cookies for debugging
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll().map((c) => ({
      name: c.name,
      // Only show first few chars of value for security
      value: c.value.substring(0, 5) + "...",
      path: c.path,
      expires: c.expires,
    }))

    // Check auth state using our getServerUser function
    const { user, error } = await getServerUser()

    // Also check directly with Supabase for comparison
    const supabase = createRouteHandlerClient()

    // Get user data directly
    const { data: userData, error: userError } = await supabase.auth.getUser()

    // Get session data directly
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    // Get auth cookie name
    const authCookieName = Object.keys(cookieStore.getAll()).find(
      (name) => name.includes("sb-") && name.includes("-auth"),
    )

    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id ? user.id.substring(0, 8) + "..." : null,
      error: error ? error.message : null,
      cookieCount: allCookies.length,
      authCookiePresent: !!authCookieName,
      authCookieName,
      cookies: allCookies,
      directCheck: {
        userPresent: !!userData.user,
        sessionPresent: !!sessionData.session,
        userError: userError?.message,
        sessionError: sessionError?.message,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
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
