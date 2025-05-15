import { safeString, safeNumber } from "@/lib/data-safety-utils"
import type { ReviewComment, SafeReviewComment, SafeServiceReview } from "@/types/reviews"

/**
 * Safely process review data to ensure all required fields exist
 */
export function processSafeReview(review: any): SafeServiceReview {
  if (!review || typeof review !== "object") {
    return { id: 0, service_id: 0 }
  }

  return {
    id: safeNumber(review.id, 0),
    service_id: safeNumber(review.service_id, 0),
    user_id: safeString(review.user_id, ""),
    author_name: safeString(review.author_name, "Anonymous"),
    author_avatar: safeString(review.author_avatar, "/placeholder.svg"),
    rating: safeNumber(review.rating, 0),
    title: safeString(review.title, "Review"),
    content: safeString(review.content, ""),
    interface_rating: review.interface_rating !== null ? safeNumber(review.interface_rating, 0) : null,
    reliability_rating: review.reliability_rating !== null ? safeNumber(review.reliability_rating, 0) : null,
    content_rating: review.content_rating !== null ? safeNumber(review.content_rating, 0) : null,
    value_rating: review.value_rating !== null ? safeNumber(review.value_rating, 0) : null,
    likes: safeNumber(review.likes, 0),
    dislikes: safeNumber(review.dislikes, 0),
    created_at: safeString(review.created_at, new Date().toISOString()),
  }
}

/**
 * Safely process comment data to ensure all required fields exist
 */
export function processSafeComment(comment: any, userReaction: string | null = null): SafeReviewComment {
  if (!comment || typeof comment !== "object") {
    return { id: 0 }
  }

  return {
    id: comment.id !== undefined ? comment.id : 0,
    review_id: comment.review_id !== null ? safeNumber(comment.review_id, 0) : null,
    parent_comment_id: comment.parent_comment_id !== null ? safeNumber(comment.parent_comment_id, 0) : null,
    user_id: safeString(comment.user_id, ""),
    author_name: safeString(comment.author_name, "Anonymous"),
    author_avatar: safeString(comment.author_avatar, "/placeholder.svg"),
    content: safeString(comment.content, ""),
    likes: safeNumber(comment.likes, 0),
    dislikes: safeNumber(comment.dislikes, 0),
    created_at: safeString(comment.created_at, new Date().toISOString()),
    updated_at: comment.updated_at ? safeString(comment.updated_at) : null,
    nesting_level: safeNumber(comment.nesting_level, 1),
    replies: Array.isArray(comment.replies) ? comment.replies : [],
    user_reaction: userReaction,
    isOptimistic: !!comment.isOptimistic,
  }
}

/**
 * Safely get display name from user data
 */
export function getDisplayNameFromData(user: any, userProfile: any): string {
  if (!user) return "Anonymous"

  try {
    // First try to get the display name from user_profiles
    if (userProfile && userProfile.display_name) {
      return userProfile.display_name
    }

    // If no profile or no display name, try to get the name from user metadata
    const metadata = user.user_metadata || {}
    const fullName = metadata.full_name || metadata.name || metadata.preferred_username

    if (fullName) return fullName

    // If no name is found, try to use the email
    const email = user.email
    if (email && typeof email === "string") {
      // Return the part before the @ symbol
      return email.split("@")[0]
    }

    // If all else fails, return the user ID truncated
    return user.id ? `User ${user.id.substring(0, 6)}` : "Anonymous"
  } catch (error) {
    console.error("Error getting display name:", error)
    return "Anonymous"
  }
}

/**
 * Build a comment tree from flat comment data
 * With improved handling for deeply nested comments
 */
export function buildCommentTree(
  topLevelComments: any[],
  allReplies: any[],
  userReactionsMap: Record<string, string>,
): ReviewComment[] {
  // Safety check for invalid input
  if (!Array.isArray(topLevelComments)) topLevelComments = []
  if (!Array.isArray(allReplies)) allReplies = []
  if (!userReactionsMap) userReactionsMap = {}

  console.log(`Building comment tree: ${topLevelComments.length} top-level comments, ${allReplies.length} replies`)

  const commentMap = new Map<number, ReviewComment>()

  // First pass: Create all comment objects and store them in the map
  const processComment = (comment: any) => {
    if (!comment || !comment.id) return null

    const userReaction = userReactionsMap[`comment_${comment.id}`] || null
    const processedComment = processSafeComment(comment, userReaction) as ReviewComment

    // Initialize empty replies array to ensure it's never undefined
    processedComment.replies = []

    // Set default nesting level to 1 (top-level)
    processedComment.nesting_level = 1

    commentMap.set(comment.id, processedComment)
    return processedComment
  }

  // Process top-level comments
  const processedTopComments = topLevelComments?.map(processComment).filter(Boolean) || []

  // Process all replies
  allReplies?.forEach(processComment)

  // Second pass: Build the tree structure
  commentMap.forEach((comment) => {
    if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
      const parent = commentMap.get(comment.parent_comment_id)
      if (parent) {
        // Calculate nesting level based on parent
        comment.nesting_level = (parent.nesting_level || 1) + 1

        // Add to parent's replies array
        parent.replies.push(comment)
      }
    }
  })

  // Sort replies by creation date (oldest first)
  commentMap.forEach((comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateA - dateB
      })
    }
  })

  console.log(`Built comment tree with ${processedTopComments.length} top-level comments`)
  return processedTopComments
}

/**
 * Update a comment tree with a new reply
 */
export function updateCommentTreeWithReply(
  comments: ReviewComment[],
  parentCommentId: number | string,
  newReply: ReviewComment,
): ReviewComment[] {
  return comments.map((comment) => {
    if (comment.id === parentCommentId) {
      return {
        ...comment,
        replies: [...(comment.replies || []), newReply],
      }
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentTreeWithReply(comment.replies, parentCommentId, newReply),
      }
    }
    return comment
  })
}

/**
 * Replace a comment in a comment tree
 */
export function replaceCommentInTree(
  comments: ReviewComment[],
  oldCommentId: number | string,
  newComment: ReviewComment,
): ReviewComment[] {
  return comments.map((comment) => {
    if (comment.id === oldCommentId) {
      return newComment
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: replaceCommentInTree(comment.replies, oldCommentId, newComment),
      }
    }
    return comment
  })
}

/**
 * Remove a comment from a comment tree
 */
export function removeCommentFromTree(comments: ReviewComment[], commentIdToRemove: number | string): ReviewComment[] {
  return comments
    .filter((comment) => comment.id !== commentIdToRemove)
    .map((comment) => {
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: removeCommentFromTree(comment.replies, commentIdToRemove),
        }
      }
      return comment
    })
}

/**
 * Update reaction counts in a comment tree
 */
export function updateCommentReactionInTree(
  comments: ReviewComment[],
  commentId: number,
  currentReaction: string | null,
  newReaction: string | null,
): ReviewComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      let likes = safeNumber(comment.likes, 0)
      let dislikes = safeNumber(comment.dislikes, 0)

      // Remove previous reaction if exists
      if (currentReaction === "like") likes = Math.max(0, likes - 1)
      if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1)

      // Add new reaction if not removing
      if (newReaction) {
        if (newReaction === "like") likes++
        if (newReaction === "dislike") dislikes++
      }

      return {
        ...comment,
        likes,
        dislikes,
        user_reaction: newReaction,
      }
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentReactionInTree(comment.replies, commentId, currentReaction, newReaction),
      }
    }
    return comment
  })
}
