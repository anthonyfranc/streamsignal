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
    id: comment.id !== undefined ? safeNumber(comment.id, 0) : 0,
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
 * CRITICAL FIX: Complete rewrite of the tree building algorithm
 */
export function buildCommentTree(
  topLevelComments: any[],
  allReplies: any[],
  userReactionsMap: Record<string, string>,
): ReviewComment[] {
  console.log(
    `Building comment tree with ${topLevelComments?.length || 0} top comments and ${allReplies?.length || 0} replies`,
  )

  // Safety checks for input parameters
  if (!Array.isArray(topLevelComments)) {
    console.warn("topLevelComments is not an array, using empty array instead")
    topLevelComments = []
  }

  if (!Array.isArray(allReplies)) {
    console.warn("allReplies is not an array, using empty array instead")
    allReplies = []
  }

  if (!userReactionsMap || typeof userReactionsMap !== "object") {
    console.warn("userReactionsMap is not an object, using empty object instead")
    userReactionsMap = {}
  }

  // Create a map to store all comments by ID for quick lookup
  const commentMap = new Map<number, ReviewComment>()

  // Process a comment and add it to the map
  const processComment = (comment: any): ReviewComment | null => {
    if (!comment || typeof comment !== "object" || comment.id === undefined) {
      console.warn("Invalid comment object:", comment)
      return null
    }

    const commentId = safeNumber(comment.id, 0)
    if (commentId === 0) {
      console.warn("Comment has invalid ID:", comment)
      return null
    }

    // If we've already processed this comment, return the existing one
    if (commentMap.has(commentId)) {
      return commentMap.get(commentId) || null
    }

    const userReaction = userReactionsMap[`comment_${commentId}`] || null
    const processedComment = processSafeComment(comment, userReaction) as ReviewComment

    // Ensure replies array is initialized
    processedComment.replies = []

    // Store in map for quick lookup
    commentMap.set(commentId, processedComment)

    return processedComment
  }

  // First pass: Process all comments and add them to the map
  console.log("Processing top-level comments...")
  const processedTopComments = topLevelComments.map(processComment).filter(Boolean) as ReviewComment[]

  console.log("Processing all replies...")
  allReplies.forEach(processComment)

  console.log(`Processed ${commentMap.size} total comments`)

  // Second pass: Build the tree structure by connecting replies to parents
  console.log("Building comment tree structure...")
  commentMap.forEach((comment) => {
    const parentId = comment.parent_comment_id

    // Skip top-level comments (they don't have a parent)
    if (parentId === null || parentId === undefined) {
      return
    }

    // Find the parent comment
    const parentComment = commentMap.get(parentId)
    if (!parentComment) {
      console.warn(`Parent comment ${parentId} not found for comment ${comment.id}`)
      return
    }

    // Calculate nesting level based on parent
    comment.nesting_level = (parentComment.nesting_level || 1) + 1

    // Add this comment to its parent's replies
    if (!parentComment.replies) {
      parentComment.replies = []
    }

    // Avoid duplicate replies
    if (!parentComment.replies.some((reply) => reply.id === comment.id)) {
      parentComment.replies.push(comment)
    }
  })

  // Third pass: Sort replies by creation date
  console.log("Sorting replies by creation date...")
  commentMap.forEach((comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => {
        try {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateA - dateB
        } catch (error) {
          console.error("Error sorting replies:", error)
          return 0
        }
      })
    }
  })

  console.log(`Built comment tree with ${processedTopComments.length} top-level comments`)

  // Debug: Log the first few top comments with their reply counts
  processedTopComments.slice(0, 3).forEach((comment) => {
    console.log(`Top comment ${comment.id} has ${comment.replies?.length || 0} direct replies`)
  })

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
