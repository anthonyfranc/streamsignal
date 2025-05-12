"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { getCurrentUser, getUserDisplayName } from "@/lib/auth-utils"
import type { ReviewComment } from "@/types/reviews"

// Submit a new review
export async function submitReview(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: "You must be logged in to submit a review" }
  }

  const serviceId = Number.parseInt(formData.get("serviceId") as string)
  const rating = Number.parseFloat(formData.get("rating") as string)
  const title = formData.get("title") as string
  const content = formData.get("content") as string
  const interfaceRating = Number.parseFloat((formData.get("interfaceRating") as string) || "0")
  const reliabilityRating = Number.parseFloat((formData.get("reliabilityRating") as string) || "0")
  const contentRating = Number.parseFloat((formData.get("contentRating") as string) || "0")
  const valueRating = Number.parseFloat((formData.get("valueRating") as string) || "0")

  // Get user display name using our helper function
  const authorName = await getUserDisplayName(user)

  // Get avatar URL from user metadata or profile
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .single()

  const authorAvatar = userProfile?.avatar_url || user.user_metadata?.avatar_url || null

  console.log("Submitting review with author:", {
    userId: user.id,
    authorName,
    authorAvatar,
    userMetadata: user.user_metadata,
  })

  try {
    const { data, error } = await supabase
      .from("service_reviews")
      .insert({
        service_id: serviceId,
        user_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatar,
        rating,
        title,
        content,
        interface_rating: interfaceRating || null,
        reliability_rating: reliabilityRating || null,
        content_rating: contentRating || null,
        value_rating: valueRating || null,
        likes: 0,
        dislikes: 0,
      })
      .select()

    if (error) {
      console.error("Error submitting review:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/services/${serviceId}`)
    return { success: true, data }
  } catch (error) {
    console.error("Error submitting review:", error)
    return { success: false, error: "Failed to submit review" }
  }
}

// Submit a comment on a review
export async function submitComment(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: "You must be logged in to comment" }
  }

  const reviewId = Number.parseInt(formData.get("reviewId") as string)
  const content = formData.get("content") as string
  const serviceId = Number.parseInt(formData.get("serviceId") as string)

  // Get user display name using our helper function
  const authorName = await getUserDisplayName(user)

  // Get avatar URL from user profile
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .single()

  const authorAvatar = userProfile?.avatar_url || user.user_metadata?.avatar_url || null

  try {
    const { data, error } = await supabase
      .from("review_comments")
      .insert({
        review_id: reviewId,
        parent_comment_id: null,
        user_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatar,
        content,
        likes: 0,
        dislikes: 0,
        nesting_level: 1,
      })
      .select()

    if (error) {
      console.error("Error submitting comment:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/services/${serviceId}`)
    return { success: true, data }
  } catch (error) {
    console.error("Error submitting comment:", error)
    return { success: false, error: "Failed to submit comment" }
  }
}

// Submit a reply to a comment
export async function submitReply(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: "You must be logged in to reply" }
  }

  const parentCommentId = Number.parseInt(formData.get("parentCommentId") as string)
  const content = formData.get("content") as string
  const serviceId = Number.parseInt(formData.get("serviceId") as string)
  const nestingLevel = Number.parseInt(formData.get("nestingLevel") as string) + 1

  // Check if we've reached maximum nesting level
  if (nestingLevel > 3) {
    return { success: false, error: "Maximum reply depth reached" }
  }

  // Get user display name using our helper function
  const authorName = await getUserDisplayName(user)

  // Get avatar URL from user profile
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("avatar_url")
    .eq("user_id", user.id)
    .single()

  const authorAvatar = userProfile?.avatar_url || user.user_metadata?.avatar_url || null

  try {
    const { data, error } = await supabase
      .from("review_comments")
      .insert({
        review_id: null,
        parent_comment_id: parentCommentId,
        user_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatar,
        content,
        likes: 0,
        dislikes: 0,
        nesting_level: nestingLevel,
      })
      .select()

    if (error) {
      console.error("Error submitting reply:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/services/${serviceId}`)
    return { success: true, data }
  } catch (error) {
    console.error("Error submitting reply:", error)
    return { success: false, error: "Failed to submit reply" }
  }
}

// React to a comment (like/dislike)
export async function reactToComment(formData: FormData) {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, error: "You must be logged in to react" }
  }

  const commentId = Number.parseInt(formData.get("commentId") as string)
  const reactionType = formData.get("reactionType") as "like" | "dislike"
  const serviceId = Number.parseInt(formData.get("serviceId") as string)

  try {
    // Check if user already reacted to this comment
    const { data: existingReaction, error: fetchError } = await supabase
      .from("comment_reactions")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows returned
      console.error("Error checking existing reaction:", fetchError)
      return { success: false, error: fetchError.message }
    }

    // If user already reacted with the same reaction, remove it (toggle off)
    if (existingReaction && existingReaction.reaction_type === reactionType) {
      const { error: deleteError } = await supabase.from("comment_reactions").delete().eq("id", existingReaction.id)

      if (deleteError) {
        console.error("Error removing reaction:", deleteError)
        return { success: false, error: deleteError.message }
      }

      // Update comment likes/dislikes count
      await updateCommentReactionCount(commentId, reactionType, -1)
    }
    // If user already reacted with a different reaction, update it
    else if (existingReaction) {
      const { error: updateError } = await supabase
        .from("comment_reactions")
        .update({ reaction_type: reactionType })
        .eq("id", existingReaction.id)

      if (updateError) {
        console.error("Error updating reaction:", updateError)
        return { success: false, error: updateError.message }
      }

      // Update comment likes/dislikes count for both old and new reaction types
      await updateCommentReactionCount(commentId, existingReaction.reaction_type, -1)
      await updateCommentReactionCount(commentId, reactionType, 1)
    }
    // If no existing reaction, create a new one
    else {
      const { error: insertError } = await supabase.from("comment_reactions").insert({
        comment_id: commentId,
        user_id: user.id,
        reaction_type: reactionType,
      })

      if (insertError) {
        console.error("Error adding reaction:", insertError)
        return { success: false, error: insertError.message }
      }

      // Update comment likes/dislikes count
      await updateCommentReactionCount(commentId, reactionType, 1)
    }

    revalidatePath(`/services/${serviceId}`)
    return { success: true }
  } catch (error) {
    console.error("Error processing reaction:", error)
    return { success: false, error: "Failed to process reaction" }
  }
}

// Helper function to update comment like/dislike count
async function updateCommentReactionCount(commentId: number, reactionType: "like" | "dislike", change: number) {
  try {
    const { data: comment, error: fetchError } = await supabase
      .from("review_comments")
      .select(reactionType === "like" ? "likes" : "dislikes")
      .eq("id", commentId)
      .single()

    if (fetchError) {
      console.error("Error fetching comment:", fetchError)
      return
    }

    const currentCount = reactionType === "like" ? comment.likes : comment.dislikes
    const newCount = Math.max(0, currentCount + change) // Ensure count doesn't go below 0

    const updateData = reactionType === "like" ? { likes: newCount } : { dislikes: newCount }

    const { error: updateError } = await supabase.from("review_comments").update(updateData).eq("id", commentId)

    if (updateError) {
      console.error("Error updating comment reaction count:", updateError)
    }
  } catch (error) {
    console.error("Error updating comment reaction count:", error)
  }
}

// Get all comments for a review with nested replies
export async function getReviewComments(reviewId: number) {
  const user = await getCurrentUser()

  try {
    // Get all top-level comments for this review
    const { data: topLevelComments, error: commentsError } = await supabase
      .from("review_comments")
      .select("*")
      .eq("review_id", reviewId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: true })

    if (commentsError) {
      console.error("Error fetching comments:", commentsError)
      return []
    }

    // Get all replies (comments with parent_comment_id)
    const { data: allReplies, error: repliesError } = await supabase
      .from("review_comments")
      .select("*")
      .is("review_id", null)
      .not("parent_comment_id", "is", null)
      .order("created_at", { ascending: true })

    if (repliesError) {
      console.error("Error fetching replies:", repliesError)
      return topLevelComments || []
    }

    // Get user reactions if logged in
    let userReactions: Record<number, "like" | "dislike"> = {}

    if (user) {
      const { data: reactions, error: reactionsError } = await supabase
        .from("comment_reactions")
        .select("comment_id, reaction_type")
        .eq("user_id", user.id)

      if (!reactionsError && reactions) {
        userReactions = reactions.reduce(
          (acc, reaction) => {
            acc[reaction.comment_id] = reaction.reaction_type as "like" | "dislike"
            return acc
          },
          {} as Record<number, "like" | "dislike">,
        )
      }
    }

    // Build comment tree
    const commentMap = new Map<number, ReviewComment>()

    // Process top-level comments
    const processedTopComments =
      topLevelComments?.map((comment) => {
        const processedComment = {
          ...comment,
          replies: [],
          user_reaction: userReactions[comment.id] || null,
        }
        commentMap.set(comment.id, processedComment)
        return processedComment
      }) || []

    // Process replies and build the tree
    allReplies?.forEach((reply) => {
      const processedReply = {
        ...reply,
        replies: [],
        user_reaction: userReactions[reply.id] || null,
      }

      commentMap.set(reply.id, processedReply)

      // Add this reply to its parent's replies array
      if (reply.parent_comment_id && commentMap.has(reply.parent_comment_id)) {
        const parent = commentMap.get(reply.parent_comment_id)
        if (parent && parent.replies) {
          parent.replies.push(processedReply)
        }
      }
    })

    return processedTopComments
  } catch (error) {
    console.error("Error getting review comments:", error)
    return []
  }
}
