import { NextResponse } from "next/server"
import { getSession, getUser, getServerSupabase } from "@/lib/server-auth"

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json()
    const { action } = body || {}

    // Get user and session using our updated server auth
    const user = await getUser()
    const session = await getSession()
    const supabase = await getServerSupabase()

    // Test direct database access if requested
    let dbAccessResult = null
    let voteTestResult = null

    if (action === "test-db-access" && user) {
      try {
        // Try to read from a table that should be accessible to authenticated users
        const { data, error } = await supabase.from("user_profiles").select("id").limit(1)

        dbAccessResult = {
          success: !error,
          data: data ? "Data retrieved successfully" : "No data",
          error: error ? error.message : null,
        }
      } catch (dbError) {
        dbAccessResult = {
          success: false,
          error: dbError instanceof Error ? dbError.message : "Unknown error",
        }
      }
    }

    if (action === "test-vote" && user) {
      try {
        // Try to insert a test vote and then immediately delete it
        const testVoteData = {
          review_id: "1", // Use a valid review ID
          user_id: user.id,
          vote_type: "upvote",
        }

        // Insert test vote
        const { data: insertData, error: insertError } = await supabase
          .from("review_votes")
          .insert(testVoteData)
          .select()

        if (insertError) {
          voteTestResult = {
            success: false,
            phase: "insert",
            error: insertError.message,
            details: insertError,
          }
        } else {
          // Delete the test vote
          const voteId = insertData[0]?.id
          const { error: deleteError } = await supabase.from("review_votes").delete().eq("id", voteId)

          voteTestResult = {
            success: !deleteError,
            phase: deleteError ? "delete" : "complete",
            error: deleteError ? deleteError.message : null,
          }
        }
      } catch (voteError) {
        voteTestResult = {
          success: false,
          phase: "exception",
          error: voteError instanceof Error ? voteError.message : "Unknown error",
        }
      }
    }

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
      dbAccessResult,
      voteTestResult,
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
