import { type NextRequest, NextResponse } from "next/server"
import { verifyServerAuth } from "@/lib/server-auth"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    // Get the user ID using our server auth verification
    const userId = await verifyServerAuth()

    // Get the raw session for debugging
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)
    const { data: sessionData } = await supabase.auth.getSession()

    // Get all cookies for debugging
    const allCookies = cookieStore.getAll().map((c) => `${c.name}: ${c.value.substring(0, 10)}...`)

    if (userId) {
      return NextResponse.json({
        authenticated: true,
        userId,
        message: "Authentication successful",
        debug: {
          sessionExists: !!sessionData.session,
          cookiesCount: allCookies.length,
          // Don't include full cookie values in response for security
          cookieNames: cookieStore.getAll().map((c) => c.name),
        },
      })
    } else {
      return NextResponse.json({
        authenticated: false,
        message: "Not authenticated",
        debug: {
          sessionExists: !!sessionData.session,
          cookiesCount: allCookies.length,
          // Don't include full cookie values in response for security
          cookieNames: cookieStore.getAll().map((c) => c.name),
        },
      })
    }
  } catch (error) {
    console.error("Error in auth test:", error)
    return NextResponse.json(
      {
        authenticated: false,
        message: error instanceof Error ? error.message : "Unknown error",
        error: true,
      },
      { status: 500 },
    )
  }
}
