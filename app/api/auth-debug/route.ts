import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase-ssr"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient()

    // Get all cookies for debugging
    const allCookies = cookieStore.getAll().map((c) => ({
      name: c.name,
      // Only show first few characters of value for security
      value: c.value.substring(0, 5) + "...",
      path: c.path,
      expires: c.expires,
    }))

    // Get the session
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session
    const sessionError = sessionResult.error

    // Get the user
    const userResult = await supabase.auth.getUser()
    const user = userResult.data.user
    const userError = userResult.error

    // Get server user using our helper
    const serverUserResult = await getServerUser()

    // Check environment variables (redacted for security)
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ Set" : "✗ Missing",
    }

    return NextResponse.json({
      success: true,
      auth: {
        sessionExists: !!session,
        userExists: !!user,
        userId: user?.id,
        email: user?.email,
        aud: user?.aud,
        role: user?.role,
      },
      serverAuth: {
        sessionExists: !!serverUserResult.session,
        userExists: !!serverUserResult.user,
        userId: serverUserResult.user?.id,
        error: serverUserResult.error
          ? serverUserResult.error instanceof Error
            ? serverUserResult.error.message
            : String(serverUserResult.error)
          : null,
      },
      debug: {
        cookiesCount: allCookies.length,
        cookies: allCookies,
        sessionError: sessionError?.message,
        userError: userError?.message,
        environment: envVars,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error in auth debug:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
