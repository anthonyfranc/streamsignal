"use server"

import { getUser, getServerSupabase } from "@/lib/server-auth"
import { revalidatePath } from "next/cache"

export async function submitVote(formData: FormData) {
  try {
    const user = await getUser()

    if (!user) {
      return { success: false, error: "Authentication required" }
    }

    const reviewId = formData.get("reviewId") as string
    const voteType = formData.get("voteType") as string

    if (!reviewId || !voteType) {
      return { success: false, error: "Missing required fields" }
    }

    const supabase = await getServerSupabase()

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from("review_votes")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .single()

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote if clicking the same button
        const { error: deleteError } = await supabase.from("review_votes").delete().eq("id", existingVote.id)

        if (deleteError) {
          console.error("Error deleting vote:", deleteError)
          return { success: false, error: "Failed to remove vote" }
        }
      } else {
        // Update vote if changing vote type
        const { error: updateError } = await supabase
          .from("review_votes")
          .update({ vote_type: voteType })
          .eq("id", existingVote.id)

        if (updateError) {
          console.error("Error updating vote:", updateError)
          return { success: false, error: "Failed to update vote" }
        }
      }
    } else {
      // Insert new vote
      const { error: insertError } = await supabase.from("review_votes").insert({
        review_id: reviewId,
        user_id: user.id,
        vote_type: voteType,
      })

      if (insertError) {
        console.error("Error inserting vote:", insertError)
        return { success: false, error: "Failed to submit vote" }
      }
    }

    // Update vote counts
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

    const { error: updateReviewError } = await supabase
      .from("service_reviews")
      .update({
        upvotes: upvotes?.length || 0,
        downvotes: downvotes?.length || 0,
      })
      .eq("id", reviewId)

    if (updateReviewError) {
      console.error("Error updating review vote counts:", updateReviewError)
    }

    revalidatePath("/services/[id]")

    return {
      success: true,
      voteType: existingVote?.vote_type === voteType ? null : voteType,
      upvotes: upvotes?.length || 0,
      downvotes: downvotes?.length || 0,
    }
  } catch (error) {
    console.error("Vote submission error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
