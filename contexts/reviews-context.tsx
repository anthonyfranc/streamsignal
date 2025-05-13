"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import type { ServiceReview, ReviewComment, SafeReviewComment, SafeServiceReview } from "@/types/reviews"
import { safeString, safeNumber, safeGet } from "@/lib/data-safety-utils"

// Safely get user from session
async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) {
      return null
    }
    return data.session.user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

// Safely get display name from user data
function getDisplayNameFromData(user: any, userProfile: any): string {
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

// Safely process review data to ensure all required fields exist
function processSafeReview(review: any): SafeServiceReview {
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

// Safely process comment data to ensure all required fields exist
function processSafeComment(comment: any, userReaction: string | null = null): SafeReviewComment {
  if (!comment || typeof comment !== "object") {
    return { id: 0 }
  }

  return {
    id: safeNumber(comment.id, 0),
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
  }
}

type ReviewsContextType = {
  reviews: ServiceReview[]
  comments: Record<number, ReviewComment[]>
  userReactions: Record<string, string>
  isLoading: boolean
  isLoadingReview: Record<number, boolean>
  isLoadingComments: Record<number, boolean>
  currentUser: any | null
  userProfile: any | null
  fetchReviews: (serviceId: number) => Promise<void>
  fetchComments: (reviewId: number) => Promise<ReviewComment[]>
  submitReview: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: ServiceReview }>
  submitComment: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: ReviewComment }>
  submitReply: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: ReviewComment }>
  reactToReview: (reviewId: number, reactionType: string) => Promise<void>
  reactToComment: (commentId: number, reactionType: string) => Promise<void>
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined)

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [comments, setComments] = useState<Record<number, ReviewComment[]>>({})
  const [userReactions, setUserReactions] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReview, setIsLoadingReview] = useState<Record<number, boolean>>({})
  const [isLoadingComments, setIsLoadingComments] = useState<Record<number, boolean>>({})
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)

  // Use refs to track if we've already fetched data
  const fetchedReviewsRef = useRef<Record<number, boolean>>({})
  const fetchedCommentsRef = useRef<Record<number, boolean>>({})
  const isFetchingUserProfile = useRef(false)

  // Check current user and fetch profile
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await getCurrentUser()
        setCurrentUser(user)

        if (user && !isFetchingUserProfile.current) {
          isFetchingUserProfile.current = true

          try {
            // Fetch user profile
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle()

            setUserProfile(profile || null)
          } catch (error) {
            console.error("Error fetching user profile:", error)
            setUserProfile(null)
          } finally {
            isFetchingUserProfile.current = false
          }
        }
      } catch (error) {
        console.error("Error checking user:", error)
        setCurrentUser(null)
      }
    }

    checkUser()
  }, [])

  // Fetch reviews for a service
  const fetchReviews = useCallback(
    async (serviceId: number) => {
      // Skip if we're already loading or have fetched this service's reviews
      if (fetchedReviewsRef.current[serviceId]) {
        return
      }

      setIsLoading(true)
      setIsLoadingReview((prev) => ({ ...prev, [serviceId]: true }))
      try {
        const { data, error } = await supabase
          .from("service_reviews")
          .select("*")
          .eq("service_id", serviceId)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching reviews:", error)
          setReviews([])
        } else {
          // Process reviews to ensure all required fields exist
          const safeReviews = (data || []).map((review) => processSafeReview(review))

          // Use functional update to prevent race conditions
          setReviews(safeReviews as ServiceReview[])

          // If user is logged in, fetch their reactions to these reviews
          if (currentUser) {
            const reviewIds = safeReviews.map((review) => review.id) || []

            if (reviewIds.length > 0) {
              try {
                const { data: reactions, error: reactionsError } = await supabase
                  .from("review_reactions")
                  .select("review_id, reaction_type")
                  .eq("user_id", currentUser.id)
                  .in("review_id", reviewIds)

                if (!reactionsError && reactions) {
                  const newUserReactions: Record<string, string> = {}
                  reactions.forEach((reaction) => {
                    if (reaction && reaction.review_id) {
                      newUserReactions[`review_${reaction.review_id}`] = safeString(reaction.reaction_type, "like")
                    }
                  })
                  setUserReactions((prev) => ({
                    ...prev,
                    ...newUserReactions,
                  }))
                } else if (reactionsError) {
                  console.error("Error fetching review reactions:", reactionsError)
                }
              } catch (error) {
                console.error("Error processing review reactions:", error)
              }
            }
          }

          // Mark this service's reviews as fetched
          fetchedReviewsRef.current[serviceId] = true
        }
      } catch (error) {
        console.error("Error fetching reviews:", error)
        setReviews([])
      } finally {
        setIsLoading(false)
        setIsLoadingReview((prev) => ({ ...prev, [serviceId]: false }))
      }
    },
    [currentUser],
  )

  // Reset fetched state when current user changes
  useEffect(() => {
    fetchedReviewsRef.current = {}
    fetchedCommentsRef.current = {}
  }, [currentUser])

  // Fetch comments for a review
  const fetchComments = useCallback(
    async (reviewId: number): Promise<ReviewComment[]> => {
      // Skip if we've already fetched comments for this review
      if (fetchedCommentsRef.current[reviewId]) {
        return comments[reviewId] || []
      }

      setIsLoadingComments((prev) => ({ ...prev, [reviewId]: true }))

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
        const userReactionsMap: Record<string, string> = {}

        if (currentUser) {
          try {
            const { data: reactions, error: reactionsError } = await supabase
              .from("comment_reactions")
              .select("comment_id, reaction_type")
              .eq("user_id", currentUser.id)

            if (!reactionsError && reactions) {
              reactions.forEach((reaction) => {
                if (reaction && reaction.comment_id) {
                  userReactionsMap[`comment_${reaction.comment_id}`] = safeString(reaction.reaction_type, "like")
                }
              })

              // Update user reactions state
              setUserReactions((prev) => ({
                ...prev,
                ...userReactionsMap,
              }))
            }
          } catch (error) {
            console.error("Error fetching comment reactions:", error)
          }
        }

        // Build comment tree
        const commentMap = new Map<number, ReviewComment>()

        // Process top-level comments
        const processedTopComments =
          topLevelComments?.map((comment) => {
            const userReaction = userReactionsMap[`comment_${comment.id}`] || null
            const processedComment = processSafeComment(comment, userReaction) as ReviewComment
            processedComment.replies = [] // Ensure replies array exists
            commentMap.set(comment.id, processedComment)
            return processedComment
          }) || []

        // Process replies and build the tree
        allReplies?.forEach((reply) => {
          if (!reply || !reply.id || !reply.parent_comment_id) return

          const userReaction = userReactionsMap[`comment_${reply.id}`] || null
          const processedReply = processSafeComment(reply, userReaction) as ReviewComment

          commentMap.set(reply.id, processedReply)

          // Add this reply to its parent's replies array
          if (reply.parent_comment_id && commentMap.has(reply.parent_comment_id)) {
            const parent = commentMap.get(reply.parent_comment_id)
            if (parent && parent.replies) {
              parent.replies.push(processedReply)
            }
          }
        })

        // Update comments state without causing re-renders elsewhere
        setComments((prev) => ({
          ...prev,
          [reviewId]: processedTopComments,
        }))

        // Mark this review's comments as fetched
        fetchedCommentsRef.current[reviewId] = true

        return processedTopComments
      } catch (error) {
        console.error("Error getting review comments:", error)
        return []
      } finally {
        setIsLoadingComments((prev) => ({ ...prev, [reviewId]: false }))
      }
    },
    [currentUser, comments],
  )

  // Submit a new review
  const submitReview = useCallback(
    async (formData: FormData) => {
      if (!currentUser) {
        return { success: false, error: "You must be logged in to submit a review" }
      }

      const serviceId = safeNumber(formData.get("serviceId"), 0)
      const rating = safeNumber(formData.get("rating"), 0)
      const title = safeString(formData.get("title"), "")
      const content = safeString(formData.get("content"), "")
      const interfaceRating = safeNumber(formData.get("interfaceRating"), 0)
      const reliabilityRating = safeNumber(formData.get("reliabilityRating"), 0)
      const contentRating = safeNumber(formData.get("contentRating"), 0)
      const valueRating = safeNumber(formData.get("valueRating"), 0)

      if (serviceId === 0 || rating === 0 || !title.trim() || !content.trim()) {
        return { success: false, error: "Missing required fields" }
      }

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar =
          safeGet(userProfile, "avatar_url", null) || safeGet(currentUser, "user_metadata.avatar_url", null)

        const { data, error } = await supabase
          .from("service_reviews")
          .insert({
            service_id: serviceId,
            user_id: currentUser.id,
            author_name: authorName,
            author_avatar: authorAvatar,
            rating,
            title,
            content,
            interface_rating: interfaceRating > 0 ? interfaceRating : null,
            reliability_rating: reliabilityRating > 0 ? reliabilityRating : null,
            content_rating: contentRating > 0 ? contentRating : null,
            value_rating: valueRating > 0 ? valueRating : null,
            likes: 0,
            dislikes: 0,
          })
          .select()

        if (error) {
          console.error("Error submitting review:", error)
          return { success: false, error: error.message }
        }

        // Process the new review
        const newReview = data && data[0] ? (processSafeReview(data[0]) as ServiceReview) : null

        // Update reviews state with the new review - only if we have data
        if (newReview) {
          setReviews((prev) => [newReview, ...prev])
        }

        return { success: true, data: newReview }
      } catch (error) {
        console.error("Error submitting review:", error)
        return { success: false, error: "Failed to submit review" }
      }
    },
    [currentUser, userProfile],
  )

  // Submit a comment on a review
  const submitComment = useCallback(
    async (formData: FormData) => {
      if (!currentUser) {
        return { success: false, error: "You must be logged in to comment" }
      }

      const reviewId = safeNumber(formData.get("reviewId"), 0)
      const content = safeString(formData.get("content"), "")

      if (reviewId === 0 || !content.trim()) {
        return { success: false, error: "Missing required fields" }
      }

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar =
          safeGet(userProfile, "avatar_url", null) || safeGet(currentUser, "user_metadata.avatar_url", null)

        const { data, error } = await supabase
          .from("review_comments")
          .insert({
            review_id: reviewId,
            parent_comment_id: null,
            user_id: currentUser.id,
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

        // Process the new comment
        const newComment = data && data[0] ? (processSafeComment(data[0], null) as ReviewComment) : null
        newComment!.replies = [] // Ensure replies array exists

        // Update comments state with the new comment - immutably
        if (newComment) {
          setComments((prev) => {
            const existingComments = [...(prev[reviewId] || [])]
            return {
              ...prev,
              [reviewId]: [...existingComments, newComment],
            }
          })
        }

        return { success: true, data: newComment }
      } catch (error) {
        console.error("Error submitting comment:", error)
        return { success: false, error: "Failed to submit comment" }
      }
    },
    [currentUser, userProfile],
  )

  // Submit a reply to a comment
  const submitReply = useCallback(
    async (formData: FormData) => {
      if (!currentUser) {
        return { success: false, error: "You must be logged in to reply" }
      }

      const parentCommentId = safeNumber(formData.get("parentCommentId"), 0)
      const content = safeString(formData.get("content"), "")
      const nestingLevel = safeNumber(formData.get("nestingLevel"), 1) + 1

      if (parentCommentId === 0 || !content.trim()) {
        return { success: false, error: "Missing required fields" }
      }

      // Check if we've reached maximum nesting level
      if (nestingLevel > 3) {
        return { success: false, error: "Maximum reply depth reached" }
      }

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar =
          safeGet(userProfile, "avatar_url", null) || safeGet(currentUser, "user_metadata.avatar_url", null)

        const { data, error } = await supabase
          .from("review_comments")
          .insert({
            review_id: null,
            parent_comment_id: parentCommentId,
            user_id: currentUser.id,
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

        // Process the new reply
        const newReply = data && data[0] ? (processSafeComment(data[0], null) as ReviewComment) : null
        newReply!.replies = [] // Ensure replies array exists

        // Find the review ID for this comment
        let reviewId: number | null = null
        let parentComment: ReviewComment | null = null

        // Search through all review comments to find the parent
        for (const [revId, commentsList] of Object.entries(comments)) {
          const findParentComment = (commentList: ReviewComment[]): boolean => {
            for (const comment of commentList) {
              if (comment.id === parentCommentId) {
                reviewId = safeNumber(revId, 0)
                parentComment = comment
                return true
              }
              if (comment.replies && comment.replies.length > 0) {
                if (findParentComment(comment.replies)) {
                  return true
                }
              }
            }
            return false
          }

          if (findParentComment(commentsList)) {
            break
          }
        }

        // If we found the parent comment and review ID, update the state
        if (reviewId && parentComment && newReply) {
          // Update the state immutably
          setComments((prev) => {
            // Deep clone the current state for this review
            const updatedComments = JSON.parse(JSON.stringify(prev[reviewId] || []))

            // Recursive function to find and update the parent comment
            const updateReplies = (commentList: ReviewComment[]): ReviewComment[] => {
              return commentList.map((comment) => {
                if (comment.id === parentCommentId) {
                  // Return a new comment object with the new reply added
                  return {
                    ...comment,
                    replies: [...(comment.replies || []), newReply],
                  }
                }
                if (comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: updateReplies(comment.replies),
                  }
                }
                return comment
              })
            }

            return {
              ...prev,
              [reviewId]: updateReplies(updatedComments),
            }
          })
        }

        return { success: true, data: newReply }
      } catch (error) {
        console.error("Error submitting reply:", error)
        return { success: false, error: "Failed to submit reply" }
      }
    },
    [currentUser, userProfile, comments],
  )

  // React to a review (like/dislike) - optimized to prevent unnecessary re-renders
  const reactToReview = useCallback(
    async (reviewId: number, reactionType: string) => {
      if (!currentUser) return

      // Get current reaction before updating state
      const currentReaction = userReactions[`review_${reviewId}`]
      const isRemovingReaction = currentReaction === reactionType

      try {
        // Optimistic update - update UI immediately
        setUserReactions((prev) => ({
          ...prev,
          [`review_${reviewId}`]: isRemovingReaction ? null : reactionType,
        }))

        // Only update the specific review that changed
        setReviews((prev) =>
          prev.map((review) => {
            if (review.id === reviewId) {
              let likes = safeNumber(review.likes, 0)
              let dislikes = safeNumber(review.dislikes, 0)

              // Remove previous reaction if exists
              if (currentReaction === "like") likes = Math.max(0, likes - 1)
              if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1)

              // Add new reaction if not removing
              if (!isRemovingReaction) {
                if (reactionType === "like") likes++
                if (reactionType === "dislike") dislikes++
              }

              return {
                ...review,
                likes,
                dislikes,
              }
            }
            return review
          }),
        )

        // Perform actual API call
        if (isRemovingReaction) {
          // Remove reaction
          await supabase.from("review_reactions").delete().eq("review_id", reviewId).eq("user_id", currentUser.id)
        } else {
          // Check if user already reacted
          const { data: existingReaction } = await supabase
            .from("review_reactions")
            .select("*")
            .eq("review_id", reviewId)
            .eq("user_id", currentUser.id)
            .maybeSingle()

          if (existingReaction) {
            // Update existing reaction
            await supabase
              .from("review_reactions")
              .update({ reaction_type: reactionType })
              .eq("id", existingReaction.id)
          } else {
            // Create new reaction
            await supabase.from("review_reactions").insert({
              review_id: reviewId,
              user_id: currentUser.id,
              reaction_type: reactionType,
            })
          }
        }

        // Update review likes/dislikes count in database
        const { data: review } = await supabase
          .from("service_reviews")
          .select("likes, dislikes")
          .eq("id", reviewId)
          .single()

        if (review) {
          let likes = safeNumber(review.likes, 0)
          let dislikes = safeNumber(review.dislikes, 0)

          // Remove previous reaction if exists
          if (currentReaction === "like") likes = Math.max(0, likes - 1)
          if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1)

          // Add new reaction if not removing
          if (!isRemovingReaction) {
            if (reactionType === "like") likes++
            if (reactionType === "dislike") dislikes++
          }

          await supabase.from("service_reviews").update({ likes, dislikes }).eq("id", reviewId)
        }
      } catch (error) {
        console.error("Error reacting to review:", error)
        // Revert optimistic update on error
        const serviceId = reviews.find((r) => r.id === reviewId)?.service_id
        if (serviceId) {
          // Reset the fetched flag so we can fetch fresh data
          fetchedReviewsRef.current[serviceId] = false
          await fetchReviews(serviceId)
        }
      }
    },
    [currentUser, userReactions, reviews, fetchReviews],
  )

  // React to a comment (like/dislike) - optimized to prevent unnecessary re-renders
  const reactToComment = useCallback(
    async (commentId: number, reactionType: string) => {
      if (!currentUser) return

      // Get current reaction before updating state
      const currentReaction = userReactions[`comment_${commentId}`]
      const isRemovingReaction = currentReaction === reactionType

      try {
        // Optimistic update - update UI immediately
        setUserReactions((prev) => ({
          ...prev,
          [`comment_${commentId}`]: isRemovingReaction ? null : reactionType,
        }))

        // Find the comment in the state without re-rendering the entire tree
        setComments((prevComments) => {
          // Create a new object reference
          const newComments = { ...prevComments }

          // Flag to track if we found and updated the comment
          let commentFound = false

          // Loop through each review's comments
          for (const reviewId in newComments) {
            if (!commentFound) {
              // Deep clone the comments for this review
              const reviewComments = JSON.parse(JSON.stringify(newComments[reviewId]))

              // Recursive function to find and update a comment in the tree
              const updateCommentLikes = (comments: ReviewComment[]): [ReviewComment[], boolean] => {
                const updatedComments = comments.map((comment) => {
                  // If this is the comment we're looking for
                  if (comment.id === commentId) {
                    commentFound = true

                    let likes = safeNumber(comment.likes, 0)
                    let dislikes = safeNumber(comment.dislikes, 0)

                    // Remove previous reaction if exists
                    if (currentReaction === "like") likes = Math.max(0, likes - 1)
                    if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1)

                    // Add new reaction if not removing
                    if (!isRemovingReaction) {
                      if (reactionType === "like") likes++
                      if (reactionType === "dislike") dislikes++
                    }

                    // Return updated comment
                    return {
                      ...comment,
                      likes,
                      dislikes,
                      user_reaction: isRemovingReaction ? null : reactionType,
                    }
                  }

                  // If comment has replies, search in them too
                  if (comment.replies && comment.replies.length > 0) {
                    const [updatedReplies, foundInReplies] = updateCommentLikes(comment.replies)

                    // If we found the comment in replies, update this comment with new replies
                    if (foundInReplies) {
                      commentFound = true
                      return { ...comment, replies: updatedReplies }
                    }
                  }

                  // Not the comment we're looking for
                  return comment
                })

                return [updatedComments, commentFound]
              }

              // Update the comments for this review
              const [updatedReviewComments, found] = updateCommentLikes(reviewComments)

              // If we found and updated the comment, update the state for this review
              if (found) {
                newComments[reviewId] = updatedReviewComments
                break // Exit the loop early
              }
            }
          }

          // Return the updated state
          return newComments
        })

        // Perform actual API call
        if (isRemovingReaction) {
          // Remove reaction
          await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", currentUser.id)
        } else {
          // Check if user already reacted
          const { data: existingReaction } = await supabase
            .from("comment_reactions")
            .select("*")
            .eq("comment_id", commentId)
            .eq("user_id", currentUser.id)
            .maybeSingle()

          if (existingReaction) {
            // Update existing reaction
            await supabase
              .from("comment_reactions")
              .update({ reaction_type: reactionType })
              .eq("id", existingReaction.id)
          } else {
            // Create new reaction
            await supabase.from("comment_reactions").insert({
              comment_id: commentId,
              user_id: currentUser.id,
              reaction_type: reactionType,
            })
          }
        }

        // Update comment likes/dislikes count in database
        const { data: comment } = await supabase
          .from("review_comments")
          .select("likes, dislikes")
          .eq("id", commentId)
          .single()

        if (comment) {
          let likes = safeNumber(comment.likes, 0)
          let dislikes = safeNumber(comment.dislikes, 0)

          // Remove previous reaction if exists
          if (currentReaction === "like") likes = Math.max(0, likes - 1)
          if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1)

          // Add new reaction if not removing
          if (!isRemovingReaction) {
            if (reactionType === "like") likes++
            if (reactionType === "dislike") dislikes++
          }

          await supabase.from("review_comments").update({ likes, dislikes }).eq("id", commentId)
        }
      } catch (error) {
        console.error("Error reacting to comment:", error)
        // No revert needed as we're using optimistic updates
      }
    },
    [currentUser, userReactions, comments],
  )

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      reviews,
      comments,
      isLoading,
      isLoadingReview,
      isLoadingComments,
      currentUser,
      userProfile,
      userReactions,
      fetchReviews,
      fetchComments,
      submitReview,
      submitComment,
      submitReply,
      reactToReview,
      reactToComment,
    }),
    [
      reviews,
      comments,
      isLoading,
      isLoadingReview,
      isLoadingComments,
      currentUser,
      userProfile,
      userReactions,
      fetchReviews,
      fetchComments,
      submitReview,
      submitComment,
      submitReply,
      reactToReview,
      reactToComment,
    ],
  )

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>
}

export function useReviews() {
  const context = useContext(ReviewsContext)
  if (context === undefined) {
    throw new Error("useReviews must be used within a ReviewsProvider")
  }
  return context
}
