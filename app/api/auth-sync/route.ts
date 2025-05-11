import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase-ssr"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient()

    // Get the session to refresh cookies
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    // Get all cookies for debugging
    const allCookies = cookieStore.getAll().map((c) => ({
      name: c.name,
      path: c.path,
      expires: c.expires,
    }))

    return NextResponse.json({
      success: true,
      sessionExists: !!session,
      cookiesCount: allCookies.length,
      cookieNames: allCookies.map((c) => c.name),
    })
  } catch (error) {
    console.error("Error in auth sync:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
