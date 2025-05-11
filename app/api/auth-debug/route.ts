import { NextResponse } from "next/server"
import { getSession, getUser } from "@/lib/server-auth"

export async function GET() {
  try {
    // Get user and session using our updated server auth
    const user = await getUser()
    const session = await getSession()

    // Return debug information
    return NextResponse.json({
      user: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
            lastSignIn: user.last_sign_in_at,
          }
        : null,
      session: session
        ? {
            expires_at: session.expires_at,
            token_type: session.token_type,
          }
        : null,
      auth_status: user ? "authenticated" : "unauthenticated",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Auth debug error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
