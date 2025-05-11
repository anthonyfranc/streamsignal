import { type NextRequest, NextResponse } from "next/server"
import { verifyServerAuth } from "@/lib/server-auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("Test vote endpoint called")

    // Log all cookies
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll().map((c) => c.name)
    console.log("Available cookies:", allCookies)

    // Check auth
    console.log("Verifying server auth...")
    const userId = await verifyServerAuth()
    console.log("Auth result:", userId ? "Authenticated" : "Not authenticated")

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication failed: Not authenticated",
          requireAuth: true,
        },
        { status: 401 },
      )
    }

    // Parse form data
    const formData = await request.formData()
    const reviewId = formData.get("reviewId") as string
    const voteType = formData.get("voteType") as string

    console.log("Vote request:", { reviewId, voteType, userId: userId.substring(0, 8) + "..." })

    // Simulate successful vote
    return NextResponse.json({
      success: true,
      message: "Vote recorded successfully",
      data: {
        reviewId,
        voteType,
        userId: userId.substring(0, 8) + "...",
      },
    })
  } catch (error) {
    console.error("Error in test vote:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
