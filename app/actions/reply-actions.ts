"use server"

import { revalidatePath } from "next/cache"
import { createServerActionClient } from "@/lib/supabase-client-factory"
import { verifyServerAuth } from "@/lib/server-auth"
import type { Reply } from "@/types/reviews"

export async function submitReviewReply(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean; replyId?: number }> {
  try {
    console.log("Starting reply submission process...")

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

    if (!userId) {
      console.log("No user ID returned from auth verification")
      return {
        success: false,
        message: "You must be logged in to submit a reply",
        requireAuth: true,
      }
    }

    // Create a Supabase client for server actions
    const supabase = createServerActionClient()

    // Get user's session to access metadata
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user

    // Extract and validate data
    const reviewId = Number.parseInt(formData.get("reviewId") as string)
    const content = formData.get("content") as string
    const serviceId = Number.parseInt(formData.get("serviceId") as string)
    const parentId = formData.get("parentId") ? Number.parseInt(formData.get("parentId") as string) : null

    // Get user's name from their profile
    let authorName = user?.user_metadata?.full_name || user?.user_metadata?.name || ""

    // If no name is found in metadata, try to get it from user_profiles
    if (!authorName) {
      const { data: profileData } = await supabase.from("user_profiles").select("full_name").eq("id", userId).single()

      if (profileData && profileData.full_name) {
        authorName = profileData.full_name
      } else {
        // Fallback to email username if no name is found
        authorName = user?.email?.split("@")[0] || "User"
      }
    }

    // Basic validation
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, message: "Invalid review ID" }
    }

    if (!content || content.trim().length < 1) {
      return { success: false, message: "Please provide reply content" }
    }

    // If parentId is provided, verify it exists and belongs to the same review
    if (parentId) {
      const { data: parentReply, error: parentError } = await supabase
        .from("review_replies")
        .select("review_id")
        .eq("id", parentId)
        .single()

      if (parentError || !parentReply) {
        return { success: false, message: "Invalid parent reply" }
      }

      if (parentReply.review_id !== reviewId) {
        return { success: false, message: "Parent reply does not belong to this review" }
      }
    }

    // Insert reply into database
    const { data: insertedReply, error } = await supabase
      .from("review_replies")
      .insert({
        review_id: reviewId,
        parent_id: parentId,
        user_id: userId,
        author_name: authorName,
        content,
        likes: 0,
        dislikes: 0,
        status: "approved", // Set to approved for immediate display
      })
      .select()
      .single()

    if (error) {
      console.error("Error submitting reply:", error)
      return {
        success: false,
        message: "Failed to submit reply. Please try again.",
      }
    }

    // Revalidate the service page
    if (serviceId && !isNaN(serviceId)) {
      revalidatePath(`/services/${serviceId}`)
    }

    return {
      success: true,
      message: "Your reply has been submitted successfully!",
      replyId: insertedReply.id,
    }
  } catch (error) {
    console.error("Error in submitReviewReply:", error)
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    }
  }
}

export async function getReviewReplies(reviewId: number): Promise<Reply[]> {
  try {
    const supabase = createServerActionClient()

    // Fetch all approved replies for this review
    const { data, error } = await supabase
      .from("review_replies")
      .select("*")
      .eq("review_id", reviewId)
      .eq("status", "approved")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching replies:", error)
      return []
    }

    // For each reply, fetch the user profile
    const repliesWithProfiles = await Promise.all(
      data.map(async (reply) => {
        if (reply.user_id) {
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("avatar_url")
            .eq("id", reply.user_id)
            .single()

          return {
            ...reply,
            user_profile: profileData || { avatar_url: null },
          }
        }
        return {
          ...reply,
          user_profile: { avatar_url: null },
        }
      }),
    )

    // Organize replies into a threaded structure
    const threadedReplies: Reply[] = []
    const replyMap: Record<number, Reply> = {}

    // First pass: create a map of all replies
    repliesWithProfiles.forEach((reply) => {
      replyMap[reply.id] = { ...reply, replies: [] }
    })

    // Second pass: organize into parent-child relationships
    repliesWithProfiles.forEach((reply) => {
      if (reply.parent_id === null) {
        // This is a top-level reply
        threadedReplies.push(replyMap[reply.id])
      } else {
        // This is a child reply
        if (replyMap[reply.parent_id]) {
          if (!replyMap[reply.parent_id].replies) {
            replyMap[reply.parent_id].replies = []
          }
          replyMap[reply.parent_id].replies!.push(replyMap[reply.id])
        } else {
          // If parent doesn't exist (shouldn't happen), add as top-level
          threadedReplies.push(replyMap[reply.id])
        }
      }
    })

    return threadedReplies
  } catch (error) {
    console.error("Error in getReviewReplies:", error)
    return []
  }
}
