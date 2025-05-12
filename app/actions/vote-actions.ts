"use server"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

// Add a delay function for rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function submitVote(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean }> {
  try {
    // Create a Supabase client with the cookies
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Extract the auth token from the form data
    const authToken = formData.get("authToken") as string

    // Check if user is authenticated - first try with cookies, then with the provided token
    let session = null

    // First try with cookies (for SSR/server components)
    const { data: cookieSession } = await supabase.auth.getSession()

    // If no session from cookies and we have an auth token, try to use it
    if (!cookieSession.session && authToken) {
      try {
        // Verify the token and get the session
        const { data: tokenData, error: tokenError } = await supabase.auth.getSession()

        if (tokenError) {
          console.error("Error verifying auth token:", tokenError)
          return {
            success: false,
            message: "Authentication failed. Please sign in again.",
            requireAuth: true,
          }
        }

        session = tokenData.session
      } catch (error) {
        console.error("Error processing auth token:", error)
        return {
          success: false,
          message: "Authentication failed. Please sign in again.",
          requireAuth: true,
        }
      }
    } else {
      session = cookieSession.session
    }

    // If still no valid session, require authentication
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
    let existingVote
    let existingVoteError

    try {
      const response = await supabase
        .from("review_votes")
        .select("*")
        .eq("user_id", session.user.id)
        .eq(reviewId ? "review_id" : "reply_id", reviewId || replyId)
        .is(reviewId ? "reply_id" : "review_id", null)
        .single()

      existingVote = response.data
      existingVoteError = response.error
    } catch (error) {
      // If we hit a rate limit, wait and try again
      if (error instanceof Error && error.message.includes("Too Many Requests")) {
        console.log("Rate limited, waiting before retry...")
        await delay(1000) // Wait 1 second before retrying

        const response = await supabase
          .from("review_votes")
          .select("*")
          .eq("user_id", session.user.id)
          .eq(reviewId ? "review_id" : "reply_id", reviewId || replyId)
          .is(reviewId ? "reply_id" : "review_id", null)
          .single()

        existingVote = response.data
        existingVoteError = response.error
      } else {
        throw error
      }
    }

    // If there's an existing vote of the same type, remove it (toggle behavior)
    if (existingVote && existingVote.vote_type === voteType) {
      try {
        const { error: deleteError } = await supabase.from("review_votes").delete().eq("id", existingVote.id)

        if (deleteError) {
          console.error("Error removing vote:", deleteError)
          return { success: false, message: "Failed to remove vote. Please try again." }
        }
      } catch (error) {
        // If we hit a rate limit, wait and try again
        if (error instanceof Error && error.message.includes("Too Many Requests")) {
          console.log("Rate limited on delete, waiting before retry...")
          await delay(1000) // Wait 1 second before retrying

          const { error: deleteError } = await supabase.from("review_votes").delete().eq("id", existingVote.id)

          if (deleteError) {
            console.error("Error removing vote after retry:", deleteError)
            return { success: false, message: "Failed to remove vote. Please try again." }
          }
        } else {
          throw error
        }
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
      try {
        const { error: updateError } = await supabase
          .from("review_votes")
          .update({ vote_type: voteType })
          .eq("id", existingVote.id)

        if (updateError) {
          console.error("Error updating vote:", updateError)
          return { success: false, message: "Failed to update vote. Please try again." }
        }
      } catch (error) {
        // If we hit a rate limit, wait and try again
        if (error instanceof Error && error.message.includes("Too Many Requests")) {
          console.log("Rate limited on update, waiting before retry...")
          await delay(1000) // Wait 1 second before retrying

          const { error: updateError } = await supabase
            .from("review_votes")
            .update({ vote_type: voteType })
            .eq("id", existingVote.id)

          if (updateError) {
            console.error("Error updating vote after retry:", updateError)
            return { success: false, message: "Failed to update vote. Please try again." }
          }
        } else {
          throw error
        }
      }
    } else {
      // Otherwise, insert a new vote
      try {
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
      } catch (error) {
        // If we hit a rate limit, wait and try again
        if (error instanceof Error && error.message.includes("Too Many Requests")) {
          console.log("Rate limited on insert, waiting before retry...")
          await delay(1000) // Wait 1 second before retrying

          const { error: insertError } = await supabase.from("review_votes").insert({
            review_id: reviewId,
            reply_id: replyId,
            user_id: session.user.id,
            vote_type: voteType,
          })

          if (insertError) {
            console.error("Error submitting vote after retry:", insertError)
            return { success: false, message: "Failed to submit vote. Please try again." }
          }
        } else {
          throw error
        }
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
  try {
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
  } catch (error) {
    // If we hit a rate limit, wait and try again
    if (error instanceof Error && error.message.includes("Too Many Requests")) {
      console.log("Rate limited on vote count update, waiting before retry...")
      await delay(1000) // Wait 1 second before retrying

      try {
        // Count likes
        const { data: likesData } = await supabase
          .from("review_votes")
          .select("count", { count: "exact" })
          .eq("review_id", reviewId)
          .eq("vote_type", "like")

        // Count dislikes
        const { data: dislikesData } = await supabase
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
          console.error("Error updating review vote count after retry:", updateError)
        }
      } catch (retryError) {
        console.error("Error in retry of updateReviewVoteCount:", retryError)
      }
    } else {
      console.error("Error in updateReviewVoteCount:", error)
    }
  }
}

// Helper function to update the vote count in a reply
async function updateReplyVoteCount(supabase: any, replyId: number) {
  try {
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
  } catch (error) {
    // If we hit a rate limit, wait and try again
    if (error instanceof Error && error.message.includes("Too Many Requests")) {
      console.log("Rate limited on reply vote count update, waiting before retry...")
      await delay(1000) // Wait 1 second before retrying

      try {
        // Count likes
        const { data: likesData } = await supabase
          .from("review_votes")
          .select("count", { count: "exact" })
          .eq("reply_id", replyId)
          .eq("vote_type", "like")

        // Count dislikes
        const { data: dislikesData } = await supabase
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
          console.error("Error updating reply vote count after retry:", updateError)
        }
      } catch (retryError) {
        console.error("Error in retry of updateReplyVoteCount:", retryError)
      }
    } else {
      console.error("Error in updateReplyVoteCount:", error)
    }
  }
}
