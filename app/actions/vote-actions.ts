"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { verifyServerAuth } from "@/lib/server-auth"

// Add a delay function for rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function submitVote(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean }> {
  try {
    // Add more detailed logging
    console.log("Starting vote submission process...")

    // Get the user ID with better error handling
    let userId
    try {
      userId = await verifyServerAuth()
      console.log(`Auth verification result: ${userId ? "Success" : "Failed"}`)
    } catch (authError) {
      console.error("Authentication verification error:", authError)
      return {
        success: false,
        message: "Authentication error. Please try logging in again.",
        requireAuth: true,
      }
    }

    // Log authentication status for debugging
    console.log(
      `Server auth check result: ${userId ? "Authenticated as " + userId.substring(0, 8) + "..." : "Not authenticated"}`,
    )

    if (!userId) {
      console.log("No user ID returned from auth verification")
      return {
        success: false,
        message: "You must be logged in to vote",
        requireAuth: true,
      }
    }

    // Create a Supabase client with the cookies
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Expected error in Server Components
              console.debug("Cannot set cookie in Server Component - this is normal")
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete({ name, ...options })
            } catch (error) {
              // Expected error in Server Components
              console.debug("Cannot delete cookie in Server Component - this is normal")
            }
          },
        },
      },
    )

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
        .eq("user_id", userId)
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
          .eq("user_id", userId)
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
          user_id: userId,
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
            user_id: userId,
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
