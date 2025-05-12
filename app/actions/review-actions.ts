"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

/**
 * Submit a review for a streaming service
 */
export async function submitReview(formData: FormData) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "You must be logged in to submit a review" }
    }

    // Get form data
    const serviceId = formData.get("serviceId") as string
    const rating = Number.parseInt(formData.get("rating") as string)
    const content = formData.get("content") as string

    if (!serviceId || isNaN(rating) || !content) {
      return { error: "Missing required fields" }
    }

    // Insert the review
    const { data, error } = await supabase
      .from("service_reviews")
      .insert({
        service_id: serviceId,
        user_id: user.id,
        rating,
        content,
      })
      .select()

    if (error) {
      console.error("Error submitting review:", error)
      return { error: "Failed to submit review" }
    }

    // Revalidate the service page
    revalidatePath(`/services/${serviceId}`)

    return { success: true, review: data[0] }
  } catch (error) {
    console.error("Error in submitReview:", error)
    return { error: "An unexpected error occurred" }
  }
}

/**
 * Submit a comment on a review
 */
export async function submitComment(formData: FormData) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "You must be logged in to submit a comment" }
    }

    // Get form data
    const reviewId = formData.get("reviewId") as string
    const content = formData.get("content") as string
    const parentId = (formData.get("parentId") as string) || null
    const serviceId = formData.get("serviceId") as string

    if (!reviewId || !content || !serviceId) {
      return { error: "Missing required fields" }
    }

    // Insert the comment
    const { data, error } = await supabase
      .from("review_comments")
      .insert({
        review_id: reviewId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      })
      .select()

    if (error) {
      console.error("Error submitting comment:", error)
      return { error: "Failed to submit comment" }
    }

    // Revalidate the service page
    revalidatePath(`/services/${serviceId}`)

    return { success: true, comment: data[0] }
  } catch (error) {
    console.error("Error in submitComment:", error)
    return { error: "An unexpected error occurred" }
  }
}

/**
 * React to a comment
 */
export async function reactToComment(formData: FormData) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "You must be logged in to react to a comment" }
    }

    // Get form data
    const commentId = formData.get("commentId") as string
    const reaction = formData.get("reaction") as string
    const serviceId = formData.get("serviceId") as string

    if (!commentId || !reaction || !serviceId) {
      return { error: "Missing required fields" }
    }

    // Check if the user has already reacted to this comment
    const { data: existingReaction, error: fetchError } = await supabase
      .from("comment_reactions")
      .select()
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "No rows returned" which is expected if no reaction exists
      console.error("Error checking existing reaction:", fetchError)
      return { error: "Failed to check existing reaction" }
    }

    let result

    if (existingReaction) {
      if (existingReaction.reaction_type === reaction) {
        // If the user is clicking the same reaction, remove it
        const { error: deleteError } = await supabase.from("comment_reactions").delete().eq("id", existingReaction.id)

        if (deleteError) {
          console.error("Error removing reaction:", deleteError)
          return { error: "Failed to remove reaction" }
        }

        result = { success: true, action: "removed" }
      } else {
        // If the user is changing their reaction, update it
        const { error: updateError } = await supabase
          .from("comment_reactions")
          .update({ reaction_type: reaction })
          .eq("id", existingReaction.id)

        if (updateError) {
          console.error("Error updating reaction:", updateError)
          return { error: "Failed to update reaction" }
        }

        result = { success: true, action: "updated" }
      }
    } else {
      // If the user hasn't reacted yet, insert a new reaction
      const { error: insertError } = await supabase.from("comment_reactions").insert({
        comment_id: commentId,
        user_id: user.id,
        reaction_type: reaction,
      })

      if (insertError) {
        console.error("Error adding reaction:", insertError)
        return { error: "Failed to add reaction" }
      }

      result = { success: true, action: "added" }
    }

    // Revalidate the service page
    revalidatePath(`/services/${serviceId}`)

    return result
  } catch (error) {
    console.error("Error in reactToComment:", error)
    return { error: "An unexpected error occurred" }
  }
}

/**
 * React to a review
 */
export async function reactToReview(formData: FormData) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "You must be logged in to react to a review" }
    }

    // Get form data
    const reviewId = formData.get("reviewId") as string
    const reaction = formData.get("reaction") as string
    const serviceId = formData.get("serviceId") as string

    if (!reviewId || !reaction || !serviceId) {
      return { error: "Missing required fields" }
    }

    // Check if the user has already reacted to this review
    const { data: existingReaction, error: fetchError } = await supabase
      .from("review_reactions")
      .select()
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "No rows returned" which is expected if no reaction exists
      console.error("Error checking existing reaction:", fetchError)
      return { error: "Failed to check existing reaction" }
    }

    let result

    if (existingReaction) {
      if (existingReaction.reaction_type === reaction) {
        // If the user is clicking the same reaction, remove it
        const { error: deleteError } = await supabase.from("review_reactions").delete().eq("id", existingReaction.id)

        if (deleteError) {
          console.error("Error removing reaction:", deleteError)
          return { error: "Failed to remove reaction" }
        }

        result = { success: true, action: "removed" }
      } else {
        // If the user is changing their reaction, update it
        const { error: updateError } = await supabase
          .from("review_reactions")
          .update({ reaction_type: reaction })
          .eq("id", existingReaction.id)

        if (updateError) {
          console.error("Error updating reaction:", updateError)
          return { error: "Failed to update reaction" }
        }

        result = { success: true, action: "updated" }
      }
    } else {
      // If the user hasn't reacted yet, insert a new reaction
      const { error: insertError } = await supabase.from("review_reactions").insert({
        review_id: reviewId,
        user_id: user.id,
        reaction_type: reaction,
      })

      if (insertError) {
        console.error("Error adding reaction:", insertError)
        return { error: "Failed to add reaction" }
      }

      result = { success: true, action: "added" }
    }

    // Revalidate the service page
    revalidatePath(`/services/${serviceId}`)

    return result
  } catch (error) {
    console.error("Error in reactToReview:", error)
    return { error: "An unexpected error occurred" }
  }
}

/**
 * Get user profile information for display
 */
export async function getUserDisplayInfo(userId: string) {
  try {
    if (!userId) {
      return { displayName: "Anonymous User" }
    }

    const supabase = createClient()

    // Try to get the user profile
    const { data, error } = await supabase.from("user_profiles").select("display_name").eq("user_id", userId).single()

    if (error) {
      console.error("Error fetching user profile:", error)
      // Return a fallback display name
      return { displayName: "User" }
    }

    return {
      displayName: data?.display_name || "User",
    }
  } catch (error) {
    console.error("Error in getUserDisplayInfo:", error)
    return { displayName: "User" }
  }
}
