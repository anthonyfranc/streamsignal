import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase-server"
import { verifyServerAuth, getServerUser } from "@/lib/server-auth"

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body
    const body = await request.json()
    const { action } = body || {}

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Get authentication status using both methods
    const userId = await verifyServerAuth()
    const { user } = await getServerUser()
    const { data: sessionData } = await supabase.auth.getSession()

    // Test direct database access
    let dbAccessResult = null
    let voteTestResult = null

    if (action === "test-db-access") {
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

    if (action === "test-vote") {
      try {
        // Try to insert a test vote and then immediately delete it
        const testVoteData = {
          review_id: 1, // Use a valid review ID
          user_id: userId,
          vote_type: "like",
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

    return NextResponse.json({
      serverAuth: {
        verifyServerAuth: !!userId,
        userId: userId,
        getServerUser: !!user,
        getSession: !!sessionData.session,
      },
      tokenInfo: user
        ? {
            exp: new Date((user.exp || 0) * 1000).toISOString(),
            iat: new Date((user.iat || 0) * 1000).toISOString(),
            isExpired: (user.exp || 0) < Math.floor(Date.now() / 1000),
          }
        : null,
      dbAccessResult,
      voteTestResult,
      cookies: {
        count: cookieStore.getAll().length,
        names: cookieStore.getAll().map((c) => c.name),
      },
    })
  } catch (error) {
    console.error("Error in auth debug:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    )
  }
}
