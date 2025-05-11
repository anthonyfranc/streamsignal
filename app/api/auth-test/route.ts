import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json({
        authenticated: false,
        message: `Authentication error: ${error.message}`,
        error: error,
      })
    }

    if (!data.session) {
      return NextResponse.json({
        authenticated: false,
        message: "No session found",
      })
    }

    return NextResponse.json({
      authenticated: true,
      userId: data.session.user.id,
      expiresAt: data.session.expires_at,
    })
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}
