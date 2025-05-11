import { type NextRequest, NextResponse } from "next/server"
import { verifyServerAuth, getServerUser } from "@/lib/server-auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Get the user ID using our server auth verification
    const userId = await verifyServerAuth()

    // Get the raw user data for debugging
    const { user } = await getServerUser()

    // Get all cookies for debugging
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll().map((c) => `${c.name}: ${c.value.substring(0, 10)}...`)

    if (userId) {
      return NextResponse.json({
        authenticated: true,
        userId,
        message: "Authentication successful",
        debug: {
          userExists: !!user,
          cookiesCount: allCookies.length,
          // Don't include full cookie values in response for security
          cookieNames: cookieStore.getAll().map((c) => c.name),
          authMethod: "getUser()",
        },
      })
    } else {
      return NextResponse.json({
        authenticated: false,
        message: "Not authenticated",
        debug: {
          userExists: !!user,
          cookiesCount: allCookies.length,
          // Don't include full cookie values in response for security
          cookieNames: cookieStore.getAll().map((c) => c.name),
          authMethod: "getUser()",
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
