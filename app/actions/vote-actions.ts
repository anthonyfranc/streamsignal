"use server"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function submitVote(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean }> {
  try {
    // Create a Supabase client with the cookies
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        success: false,
        message: "You must be logged in to vote",
        requireAuth: true,
      }
    }

    // Extract and validate data
    const reviewId = formData.get("reviewId") ? Number.parseInt(formData.get("reviewId") as string) : null
    const replyId = formData.get("replyId") ? Number.parseInt(formData.get("replyId") as string) : null
    const voteType = formData.get("voteType") as "like" | "dislike"
    const serviceId = Number.parseInt(formData.get("serviceId") as string)

    // Basic validation
    if (!reviewId && !replyId) {
      return { success: false, message: "Either reviewId or replyId must be provided" }
    }

    if (voteType !== "like" && voteType !== "dislike") {
      return { success: false, message: "Invalid vote type" }
    }

    // Check if the user has already voted on this review/reply
    const { data: existingVote, error: existingVoteError } = await supabase
      .from("review_votes")
      .select("*")
      .eq("user_id", session.user.id)
      .eq(reviewId ? "review_id" : "reply_id", reviewId || replyId)
      .is(reviewId ? "reply_id" : "review_id", null)
      .single()

    // If there's an existing vote of the same type, remove it (toggle behavior)
    if (existingVote && existingVote.vote_type === voteType) {
      const { error: deleteError } = await supabase.from("review_votes").delete().eq("id", existingVote.id)

      if (deleteError) {
        console.error("Error removing vote:", deleteError)
        return { success: false, message: "Failed to remove vote. Please try again." }
      }

      // Update the vote count in the review/reply
      if (reviewId) {
        await updateReviewVoteCount(supabase, reviewId)
      } else if (replyId) {
        await updateReplyVoteCount(supabase, replyId)
      }

      return { success: true, message: "Vote removed successfully" }
    }

    // If there's an existing vote of a different type, update it
    if (existingVote) {
      const { error: updateError } = await supabase
        .from("review_votes")
        .update({ vote_type: voteType })
        .eq("id", existingVote.id)

      if (updateError) {
        console.error("Error updating vote:", updateError)
        return { success: false, message: "Failed to update vote. Please try again." }
      }
    } else {
      // Otherwise, insert a new vote
      const { error: insertError } = await supabase.from("review_votes").insert({
        review_id: reviewId,
        reply_id: replyId,
        user_id: session.user.id,
        vote_type: voteType,
      })

      if (insertError) {
        console.error("Error submitting vote:", insertError)
        return { success: false, message: "Failed to submit vote. Please try again." }
      }
    }

    // Update the vote count in the review/reply
    if (reviewId) {
      await updateReviewVoteCount(supabase, reviewId)
    } else if (replyId) {
      await updateReplyVoteCount(supabase, replyId)
    }

    // Revalidate the service page
    if (serviceId && !isNaN(serviceId)) {
      revalidatePath(`/services/${serviceId}`)
    }

    return { success: true, message: "Vote submitted successfully" }
  } catch (error) {
    console.error("Error in submitVote:", error)
    return { success: false, message: "An unexpected error occurred. Please try again." }
  }
}

// Helper function to update the vote count in a review
async function updateReviewVoteCount(supabase: any, reviewId: number) {
  // Count likes
  const { data: likesData, error: likesError } = await supabase
    .from("review_votes")
    .select("count", { count: "exact" })
    .eq("review_id", reviewId)
    .eq("vote_type", "like")

  // Count dislikes
  const { data: dislikesData, error: dislikesError } = await supabase
    .from("review_votes")
    .select("count", { count: "exact" })
    .eq("review_id", reviewId)
    .eq("vote_type", "dislike")

  // Update the review with the new counts
  const { error: updateError } = await supabase
    .from("service_reviews")
    .update({
      likes: likesData?.count || 0,
      dislikes: dislikesData?.count || 0,
    })
    .eq("id", reviewId)

  if (updateError) {
    console.error("Error updating review vote count:", updateError)
  }
}

// Helper function to update the vote count in a reply
async function updateReplyVoteCount(supabase: any, replyId: number) {
  // Count likes
  const { data: likesData, error: likesError } = await supabase
    .from("review_votes")
    .select("count", { count: "exact" })
    .eq("reply_id", replyId)
    .eq("vote_type", "like")

  // Count dislikes
  const { data: dislikesData, error: dislikesError } = await supabase
    .from("review_votes")
    .select("count", { count: "exact" })
    .eq("reply_id", replyId)
    .eq("vote_type", "dislike")

  // Update the reply with the new counts
  const { error: updateError } = await supabase
    .from("review_replies")
    .update({
      likes: likesData?.count || 0,
      dislikes: dislikesData?.count || 0,
    })
    .eq("id", replyId)

  if (updateError) {
    console.error("Error updating reply vote count:", updateError)
  }
}
