"use server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { verifyServerAuth } from "@/lib/server-auth"
import type { Reply } from "@/types/reviews"

export async function submitReply(
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
        message: "You must be logged in to reply",
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

    // Extract data from the form
    const reviewId = Number.parseInt(formData.get("reviewId") as string)
    const content = formData.get("content") as string
    const serviceId = Number.parseInt(formData.get("serviceId") as string)

    // Validate the data
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, message: "Invalid review ID" }
    }

    if (!content || content.trim().length === 0) {
      return { success: false, message: "Reply content cannot be empty" }
    }

    // Insert the reply
    const { data: reply, error } = await supabase
      .from("review_replies")
      .insert({
        review_id: reviewId,
        user_id: userId,
        content: content.trim(),
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error submitting reply:", error)
      return { success: false, message: "Failed to submit reply. Please try again." }
    }

    // Update the reply count on the review
    const { error: updateError } = await supabase.rpc("increment_reply_count", {
      review_id_param: reviewId,
    })

    if (updateError) {
      console.error("Error updating reply count:", updateError)
      // Don't return an error here, as the reply was successfully created
    }

    // Revalidate the service page
    if (serviceId && !isNaN(serviceId)) {
      revalidatePath(`/services/${serviceId}`)
    }

    return {
      success: true,
      message: "Reply submitted successfully",
      replyId: reply?.id,
    }
  } catch (error) {
    console.error("Error in submitReply:", error)
    return { success: false, message: "An unexpected error occurred. Please try again." }
  }
}

export async function getReviewReplies(reviewId: number): Promise<Reply[]> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

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
