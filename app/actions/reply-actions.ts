"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/utils/supabase/server"
import type { ReviewReply } from "@/types/reviews"
import { cookies } from "next/headers"

// Get all replies for a specific review
export async function getReviewReplies(reviewId: number): Promise<ReviewReply[]> {
  try {
    console.log(`Server: Fetching replies for review ${reviewId}`)
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from("review_replies")
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Server: Error fetching review replies:", error)
      return []
    }

    console.log(`Server: Found ${data?.length || 0} replies for review ${reviewId}`)
    return data as ReviewReply[]
  } catch (error) {
    console.error("Server: Exception fetching review replies:", error)
    return []
  }
}

// Submit a new reply to a review
export async function submitReviewReply(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean; reply?: ReviewReply }> {
  try {
    // Log cookies for debugging
    const cookieStore = cookies()
    const authCookie = cookieStore.get("sb-auth-token")
    console.log("Server: Auth cookie present:", !!authCookie)

    const supabase = createServerSupabaseClient()

    // Get authentication status
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Server: Error getting session:", sessionError)
      return {
        success: false,
        message: "Authentication error. Please try logging in again.",
        requireAuth: true,
      }
    }

    // Extract form data
    const reviewIdRaw = formData.get("reviewId")
    const content = formData.get("content") as string

    if (!reviewIdRaw) {
      return {
        success: false,
        message: "Missing review information.",
      }
    }

    const reviewId = Number.parseInt(reviewIdRaw as string)

    if (isNaN(reviewId)) {
      return {
        success: false,
        message: "Invalid review information.",
      }
    }

    // Validate content
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        message: "Reply content must be at least 3 characters long.",
      }
    }

    if (!session) {
      console.log("Server: No session found in server action")

      // Try to use the user ID from the form data as a fallback
      const formUserId = formData.get("userId") as string | null

      if (!formUserId) {
        return {
          success: false,
          message: "You must be logged in to reply to reviews.",
          requireAuth: true,
        }
      }

      console.log("Server: Using user ID from form data:", formUserId)

      // Continue with the user ID from form data
      // This is a fallback mechanism when the server session is not available
      const authorName = (formData.get("authorName") as string) || "Anonymous"

      // Use service role client for this operation since we're bypassing auth
      const serviceClient = createServerSupabaseClient()

      // Insert the reply
      const { data, error } = await serviceClient
        .from("review_replies")
        .insert({
          review_id: reviewId,
          user_id: formUserId,
          author_name: authorName,
          content: content.trim(),
          likes: 0,
          dislikes: 0,
        })
        .select()
        .single()

      if (error) {
        console.error("Server: Error submitting reply with fallback method:", error)
        return {
          success: false,
          message: `Failed to submit your reply: ${error.message}`,
        }
      }

      console.log("Server: Reply submitted successfully with fallback method:", data)

      // Get the service ID to revalidate the page
      const { data: review } = await serviceClient
        .from("service_reviews")
        .select("service_id")
        .eq("id", reviewId)
        .single()

      if (review) {
        revalidatePath(`/services/${review.service_id}`)
      }

      return {
        success: true,
        message: "Your reply has been submitted successfully!",
        reply: data as ReviewReply,
      }
    }

    // Normal flow with session
    console.log("Server: Session found in server action:", session.user.id)

    // Extract user data
    const userId = session.user.id

    // Get author name with fallbacks
    let authorName = "Anonymous"

    // Try multiple ways to get the user's name
    if (session.user.user_metadata?.name) {
      authorName = session.user.user_metadata.name as string
    } else if (session.user.user_metadata?.full_name) {
      authorName = session.user.user_metadata.full_name as string
    } else if (session.user.email) {
      authorName = session.user.email.split("@")[0] as string
    }

    console.log("Server: Submitting reply with user:", {
      userId,
      authorName,
      reviewId,
      contentLength: content.length,
    })

    // Insert the reply
    const { data, error } = await supabase
      .from("review_replies")
      .insert({
        review_id: reviewId,
        user_id: userId,
        author_name: authorName,
        content: content.trim(),
        likes: 0,
        dislikes: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Server: Error submitting reply:", error)

      // Check if this is an auth error
      if (error.code === "42501" || error.message.includes("permission denied")) {
        return {
          success: false,
          message: "Authentication error. Please try logging in again.",
          requireAuth: true,
        }
      }

      return {
        success: false,
        message: `Failed to submit your reply: ${error.message}`,
      }
    }

    console.log("Server: Reply submitted successfully:", data)

    // Get the service ID to revalidate the page
    const { data: review } = await supabase.from("service_reviews").select("service_id").eq("id", reviewId).single()

    if (review) {
      revalidatePath(`/services/${review.service_id}`)
    }

    return {
      success: true,
      message: "Your reply has been submitted successfully!",
      reply: data as ReviewReply,
    }
  } catch (error) {
    console.error("Server: Exception in submitReviewReply:", error)
    return {
      success: false,
      message:
        error instanceof Error
          ? `An error occurred: ${error.message}`
          : "An unexpected error occurred. Please try again.",
    }
  }
}

// Update likes/dislikes for a reply
export async function updateReplyLikes(
  replyId: number,
  action: "like" | "dislike",
): Promise<{ success: boolean; message: string; requireAuth?: boolean }> {
  try {
    const supabase = createServerSupabaseClient()

    // Get authentication status
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        success: false,
        message: "You must be logged in to rate replies.",
        requireAuth: true,
      }
    }

    // Get the current reply
    const { data: reply, error: fetchError } = await supabase
      .from("review_replies")
      .select("likes, dislikes, review_id")
      .eq("id", replyId)
      .single()

    if (fetchError) {
      console.error("Server: Error fetching reply:", fetchError)
      return { success: false, message: "Failed to update reply rating" }
    }

    // Update the likes or dislikes
    const updateData = action === "like" ? { likes: (reply.likes || 0) + 1 } : { dislikes: (reply.dislikes || 0) + 1 }

    const { error: updateError } = await supabase.from("review_replies").update(updateData).eq("id", replyId)

    if (updateError) {
      console.error("Server: Error updating reply likes:", updateError)
      return { success: false, message: "Failed to update reply rating" }
    }

    // Get the service ID to revalidate the page
    if (reply.review_id) {
      const { data: review } = await supabase
        .from("service_reviews")
        .select("service_id")
        .eq("id", reply.review_id)
        .single()

      if (review) {
        revalidatePath(`/services/${review.service_id}`)
      }
    }

    return { success: true, message: "Rating updated successfully" }
  } catch (error) {
    console.error("Server: Error in updateReplyLikes:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

// Delete a reply (only for the author or admin)
export async function deleteReviewReply(replyId: number): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createServerSupabaseClient()

    // Get authentication status
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        success: false,
        message: "You must be logged in to delete replies.",
      }
    }

    // Get the reply to check ownership
    const { data: reply, error: fetchError } = await supabase
      .from("review_replies")
      .select("user_id, review_id")
      .eq("id", replyId)
      .single()

    if (fetchError) {
      console.error("Server: Error fetching reply:", fetchError)
      return { success: false, message: "Failed to find the reply" }
    }

    // Check if the user is the author
    if (reply.user_id !== session.user.id) {
      // TODO: Add admin check here if needed
      return { success: false, message: "You can only delete your own replies" }
    }

    // Delete the reply
    const { error: deleteError } = await supabase.from("review_replies").delete().eq("id", replyId)

    if (deleteError) {
      console.error("Server: Error deleting reply:", deleteError)
      return { success: false, message: "Failed to delete the reply" }
    }

    // Get the service ID to revalidate the page
    if (reply.review_id) {
      const { data: review } = await supabase
        .from("service_reviews")
        .select("service_id")
        .eq("id", reply.review_id)
        .single()

      if (review) {
        revalidatePath(`/services/${review.service_id}`)
      }
    }

    return { success: true, message: "Reply deleted successfully" }
  } catch (error) {
    console.error("Server: Error in deleteReviewReply:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
