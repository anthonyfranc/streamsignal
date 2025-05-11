import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getServerUser } from "@/lib/server-auth"

export async function GET() {
  try {
    console.log("Auth debug endpoint called")

    // Get all cookies for debugging
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll().map((c) => ({
      name: c.name,
      // Only show first few chars of value for security
      value: c.value.substring(0, 5) + "...",
      path: c.path,
      expires: c.expires,
    }))

    // Check for Supabase auth cookie specifically
    const authCookieName = allCookies
      .map((c) => c.name)
      .find((name) => name.includes("sb-") && name.includes("-auth-token"))

    console.log("Auth cookie found:", authCookieName)

    // Check auth state using our getServerUser function
    console.log("Calling getServerUser...")
    const { user, error } = await getServerUser()
    console.log("getServerUser result:", !!user, error?.message)

    // Also check directly with Supabase for comparison
    console.log("Creating direct Supabase client...")
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)
            console.log(`Direct cookie get: ${name}, found: ${!!cookie}`)
            return cookie?.value
          },
          set(name: string, value: string, options: any) {
            // API routes can set cookies
            console.log(`Direct cookie set: ${name}`)
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            console.log(`Direct cookie remove: ${name}`)
            cookieStore.delete({ name, ...options })
          },
        },
      },
    )

    // Get user data directly
    console.log("Calling direct getUser...")
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log("Direct getUser result:", !!userData.user, userError?.message)

    // Get session data directly
    console.log("Calling direct getSession...")
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    console.log("Direct getSession result:", !!sessionData.session, sessionError?.message)

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
