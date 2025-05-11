import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

// Create a singleton instance
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>()
  }
  return supabaseClient
}

export async function submitVoteDirectly(reviewId: string, voteType: string) {
  try {
    const supabase = getSupabaseClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Auth error or no user:", userError)
      return { success: false, error: "Authentication required" }
    }

    // Check if user already voted
    const { data: existingVote, error: fetchError } = await supabase
      .from("review_votes")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error fetching existing vote:", fetchError)
      return { success: false, error: "Failed to check existing vote" }
    }

    let result

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote if clicking the same button
        result = await supabase.from("review_votes").delete().eq("id", existingVote.id)
      } else {
        // Update vote if changing vote type
        result = await supabase.from("review_votes").update({ vote_type: voteType }).eq("id", existingVote.id)
      }
    } else {
      // Insert new vote
      result = await supabase.from("review_votes").insert({
        review_id: reviewId,
        user_id: user.id,
        vote_type: voteType,
      })
    }

    if (result.error) {
      console.error("Vote operation error:", result.error)
      return { success: false, error: "Failed to submit vote" }
    }

    // Get updated vote counts
    const { data: upvotes } = await supabase
      .from("review_votes")
      .select("*", { count: "exact" })
      .eq("review_id", reviewId)
      .eq("vote_type", "upvote")

    const { data: downvotes } = await supabase
      .from("review_votes")
      .select("*", { count: "exact" })
      .eq("review_id", reviewId)
      .eq("vote_type", "downvote")

    return {
      success: true,
      voteType: existingVote?.vote_type === voteType ? null : voteType,
      upvotes: upvotes?.length || 0,
      downvotes: downvotes?.length || 0,
    }
  } catch (error) {
    console.error("Direct vote submission error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
