"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { reviewsService } from "@/services/reviews-service"
import type { ServiceReview, ReviewComment } from "@/types/reviews"

interface ReviewsContextType {
  reviews: ServiceReview[]
  comments: Record<number, ReviewComment[]>
  replies: Record<number, ReviewComment[]>
  isInitialLoading: boolean
  isSubmitting: boolean
  currentUser: any
  userProfile: any
  userReactions: Record<string, string>
  commentsLoading: Record<number, boolean>
  fetchReviews: (serviceId: number) => Promise<void>
  fetchComments: (reviewId: number) => Promise<void>
  submitReview: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  submitComment: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  submitCommentReply: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  reactToReview: (reviewId: number, reactionType: string) => Promise<void>
  reactToComment: (commentId: number, reactionType: string) => Promise<void>
}

// Create a default context with empty/safe values to prevent undefined errors
const defaultContextValue: ReviewsContextType = {
  reviews: [],
  comments: {},
  replies: {},
  isInitialLoading: true,
  isSubmitting: false,
  currentUser: null,
  userProfile: null,
  userReactions: {},
  commentsLoading: {},
  fetchReviews: async () => {},
  fetchComments: async () => {},
  submitReview: async () => ({ success: false }),
  submitComment: async () => ({ success: false }),
  submitCommentReply: async () => ({ success: false }),
  reactToReview: async () => {},
  reactToComment: async () => {},
}

const ReviewsContext = createContext<ReviewsContextType>(defaultContextValue)

export const useReviews = () => {
  const context = useContext(ReviewsContext)
  // If context is undefined, return the default context value
  return context || defaultContextValue
}

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile, isLoading: isAuthLoading } = useAuth()
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [comments, setComments] = useState<Record<number, ReviewComment[]>>({})
  const [replies, setReplies] = useState<Record<number, ReviewComment[]>>({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userReactions, setUserReactions] = useState<Record<string, string>>({})
  const [authInitialized, setAuthInitialized] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({})

  // Store current service ID to prevent data loss on auth changes
  const currentServiceIdRef = useRef<number | null>(null)
  const authChangedRef = useRef(false)

  // Wait for auth to be initialized before proceeding
  useEffect(() => {
    if (!isAuthLoading && !authInitialized) {
      setAuthInitialized(true)
    }

    // Track auth changes to trigger refetch
    if (authInitialized && !isAuthLoading) {
      authChangedRef.current = true

      // If we have a stored service ID, we should refetch reviews after auth state changes
      if (currentServiceIdRef.current !== null) {
        fetchReviews(currentServiceIdRef.current)
      }
    }
  }, [isAuthLoading, authInitialized])

  // Fetch reviews for a service
  const fetchReviews = useCallback(
    async (serviceId: number) => {
      if (!serviceId) return

      // Store current service ID for potential refetches
      currentServiceIdRef.current = serviceId

      try {
        setIsInitialLoading(true)
        console.log(`Fetching reviews for service ${serviceId}, user: ${user?.id || "unauthenticated"}`)

        const { data: reviewsData, error: reviewsError } = await reviewsService.fetchReviews(serviceId)

        if (reviewsError) {
          console.error("Error fetching reviews:", reviewsError)
          return
        }

        console.log(`Found ${reviewsData?.length || 0} reviews for service ${serviceId}`)

        // Ensure we always set reviews, even if the data is empty
        const safeReviewsData = reviewsData || []
        setReviews(safeReviewsData)

        // Fetch user reactions if user is logged in
        if (user) {
          const reviewIds = safeReviewsData.map((review) => review.id).filter(Boolean)

          if (reviewIds.length > 0) {
            try {
              const { data: reactionsData, error: reactionsError } = await reviewsService.fetchReviewReactions(
                user.id,
                reviewIds as number[],
              )

              if (!reactionsError && reactionsData) {
                const reactionsMap: Record<string, string> = {}
                reactionsData.forEach((reaction) => {
                  if (reaction && reaction.review_id) {
                    reactionsMap[`review_${reaction.review_id}`] = reaction.reaction_type
                  }
                })
                setUserReactions(reactionsMap)
              }
            } catch (error) {
              console.error("Error processing review reactions:", error)
            }
          }
        }
      } catch (error) {
        console.error("Exception fetching reviews:", error)
      } finally {
        setIsInitialLoading(false)
      }
    },
    [user],
  )

  // Fetch comments for a review
  const fetchComments = useCallback(
    async (reviewId: number) => {
      if (!reviewId) return

      try {
        setCommentsLoading((prev) => ({ ...prev, [reviewId]: true }))

        const { data, error } = await reviewsService.fetchTopLevelComments(reviewId)

        if (error) {
          console.error("Error fetching comments:", error)
          return
        }

        // Safety check for data
        const safeData = Array.isArray(data) ? data : []

        setComments((prev) => ({
          ...prev,
          [reviewId]: safeData,
        }))

        // Fetch user reactions to comments if user is logged in
        if (user && safeData.length > 0) {
          try {
            const commentIds = safeData.map((comment) => comment.id).filter(Boolean)

            if (commentIds.length > 0) {
              const { data: reactionsData, error: reactionsError } = await reviewsService.fetchCommentReactions(user.id)

              if (!reactionsError && reactionsData) {
                const filteredReactions = reactionsData.filter(
                  (reaction) => reaction && reaction.comment_id && commentIds.includes(reaction.comment_id),
                )

                if (filteredReactions.length > 0) {
                  setUserReactions((prev) => {
                    const newReactions = { ...prev }
                    filteredReactions.forEach((reaction) => {
                      if (reaction && reaction.comment_id) {
                        newReactions[`comment_${reaction.comment_id}`] = reaction.reaction_type
                      }
                    })
                    return newReactions
                  })
                }
              }
            }
          } catch (error) {
            console.error("Error processing comment reactions:", error)
          }
        }
      } catch (error) {
        console.error("Exception fetching comments:", error)
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [reviewId]: false }))
      }
    },
    [user],
  )

  // Submit a new review
  const submitReview = useCallback(
    async (formData: FormData) => {
      if (!user) {
        return { success: false, error: "You must be logged in to submit a review" }
      }

      try {
        setIsSubmitting(true)

        const serviceId = Number(formData.get("serviceId"))
        const rating = Number(formData.get("rating"))
        const title = formData.get("title") as string
        const content = formData.get("content") as string
        const interfaceRating = Number(formData.get("interfaceRating") || 0)
        const reliabilityRating = Number(formData.get("reliabilityRating") || 0)
        const contentRating = Number(formData.get("contentRating") || 0)
        const valueRating = Number(formData.get("valueRating") || 0)

        if (!serviceId || !rating || !title?.trim() || !content?.trim()) {
          return { success: false, error: "Rating, title, and content are required" }
        }

        // Create review data
        const reviewData = {
          service_id: serviceId,
          user_id: user.id,
          author_name: userProfile?.display_name || user.email?.split("@")[0] || "Anonymous",
          author_avatar: userProfile?.avatar_url || user.user_metadata?.avatar_url || null,
          rating,
          title: title.trim(),
          content: content.trim(),
          interface_rating: interfaceRating || null,
          reliability_rating: reliabilityRating || null,
          content_rating: contentRating || null,
          value_rating: valueRating || null,
        }

        // Add optimistic review
        const optimisticReview = {
          ...reviewData,
          id: Date.now(), // Temporary ID
          created_at: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          isOptimistic: true,
        }

        setReviews((prev) => [optimisticReview, ...prev])

        // Submit to server
        const { data, error } = await reviewsService.submitReview(reviewData)

        if (error) {
          // Remove optimistic review on error
          setReviews((prev) => prev.filter((review) => review.id !== optimisticReview.id))
          return { success: false, error: error.message }
        }

        // Replace optimistic review with real one
        if (data && data[0]) {
          setReviews((prev) =>
            prev.map((review) => (review.id === optimisticReview.id ? { ...data[0], isOptimistic: false } : review)),
          )
        }

        return { success: true }
      } catch (error) {
        console.error("Exception submitting review:", error)
        return { success: false, error: "An unexpected error occurred" }
      } finally {
        setIsSubmitting(false)
      }
    },
    [user, userProfile],
  )

  // Submit a new comment
  const submitComment = useCallback(
    async (formData: FormData) => {
      if (!user) {
        return { success: false, error: "You must be logged in to submit a comment" }
      }

      try {
        setIsSubmitting(true)

        const reviewId = Number(formData.get("reviewId"))
        const content = formData.get("content") as string

        if (!reviewId || !content?.trim()) {
          return { success: false, error: "Review ID and content are required" }
        }

        // Create comment data
        const commentData = {
          review_id: reviewId,
          parent_comment_id: null,
          user_id: user.id,
          author_name: userProfile?.display_name || user.email?.split("@")[0] || "Anonymous",
          author_avatar: userProfile?.avatar_url || user.user_metadata?.avatar_url || null,
          content: content.trim(),
        }

        // Add optimistic comment
        const optimisticComment = {
          ...commentData,
          id: Date.now(), // Temporary ID
          created_at: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          replies: [],
          isOptimistic: true,
        }

        // Add to comments state
        setComments((prev) => ({
          ...prev,
          [reviewId]: [...(prev[reviewId] || []), optimisticComment],
        }))

        // Submit to server
        const { data, error } = await reviewsService.submitComment(commentData)

        if (error) {
          // Remove optimistic comment on error
          setComments((prev) => ({
            ...prev,
            [reviewId]: (prev[reviewId] || []).filter((comment) => comment.id !== optimisticComment.id),
          }))
          return { success: false, error: error.message }
        }

        // Replace optimistic comment with real one
        if (data && data[0]) {
          const realComment = { ...data[0], replies: [], isOptimistic: false }

          setComments((prev) => ({
            ...prev,
            [reviewId]: (prev[reviewId] || []).map((comment) =>
              comment.id === optimisticComment.id ? realComment : comment,
            ),
          }))
        }

        return { success: true }
      } catch (error) {
        console.error("Exception submitting comment:", error)
        return { success: false, error: "An unexpected error occurred" }
      } finally {
        setIsSubmitting(false)
      }
    },
    [user, userProfile],
  )

  // Submit a reply to a comment
  const submitCommentReply = useCallback(
    async (formData: FormData) => {
      if (!user) {
        return { success: false, error: "You must be logged in to reply" }
      }

      try {
        setIsSubmitting(true)

        const parentCommentId = Number(formData.get("parentCommentId"))
        const content = formData.get("content") as string
        const reviewId = Number(formData.get("reviewId") || 0)

        if (!parentCommentId || !content?.trim()) {
          return { success: false, error: "Parent comment ID and content are required" }
        }

        // Create reply data
        const replyData = {
          review_id: reviewId || null,
          parent_comment_id: parentCommentId,
          user_id: user.id,
          author_name: userProfile?.display_name || user.email?.split("@")[0] || "Anonymous",
          author_avatar: userProfile?.avatar_url || user.user_metadata?.avatar_url || null,
          content: content.trim(),
          nesting_level: 1,
        }

        // Add optimistic reply
        const optimisticReply = {
          ...replyData,
          id: Date.now(), // Temporary ID
          created_at: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          replies: [],
          isOptimistic: true,
        }

        // Submit to server first to avoid complex state updates
        const { data, error } = await reviewsService.submitComment(replyData)

        if (error) {
          return { success: false, error: error.message }
        }

        // Update comments state with the real reply data
        if (data && data[0]) {
          const realReply = { ...data[0], replies: [], isOptimistic: false }

          // If we have the review ID, update directly
          if (reviewId) {
            // Find the parent comment and add the reply
            setComments((prev) => {
              const reviewComments = [...(prev[reviewId] || [])]

              // Find parent comment index
              const parentIndex = reviewComments.findIndex((comment) => comment && comment.id === parentCommentId)

              if (parentIndex >= 0) {
                // Clone parent comment
                const parentComment = { ...reviewComments[parentIndex] }

                // Add reply to parent
                parentComment.replies = [...(parentComment.replies || []), realReply]

                // Replace parent in comments array
                reviewComments[parentIndex] = parentComment

                return {
                  ...prev,
                  [reviewId]: reviewComments,
                }
              }

              return prev
            })
          } else {
            // If we don't have review ID, we need to search for the parent comment in all reviews
            setComments((prev) => {
              const updatedComments = { ...prev }

              // Look through all review comments to find the parent
              Object.keys(updatedComments).forEach((reviewIdKey) => {
                const reviewId = Number(reviewIdKey)
                const reviewComments = [...updatedComments[reviewId]]

                // Find parent comment index
                const parentIndex = reviewComments.findIndex((comment) => comment && comment.id === parentCommentId)

                if (parentIndex >= 0) {
                  // Clone parent comment
                  const parentComment = { ...reviewComments[parentIndex] }

                  // Add reply to parent
                  parentComment.replies = [...(parentComment.replies || []), realReply]

                  // Replace parent in comments array
                  reviewComments[parentIndex] = parentComment

                  updatedComments[reviewId] = reviewComments
                }
              })

              return updatedComments
            })
          }
        }

        return { success: true }
      } catch (error) {
        console.error("Exception submitting reply:", error)
        return { success: false, error: "An unexpected error occurred" }
      } finally {
        setIsSubmitting(false)
      }
    },
    [user, userProfile],
  )

  // React to a review
  const reactToReview = useCallback(
    async (reviewId: number, reactionType: string) => {
      if (!user || !reviewId) return

      try {
        // Check if user already reacted with this type
        const existingReaction = userReactions[`review_${reviewId}`]

        // Optimistically update UI
        if (existingReaction === reactionType) {
          // Remove reaction if clicking the same one
          setUserReactions((prev) => {
            const newReactions = { ...prev }
            delete newReactions[`review_${reviewId}`]
            return newReactions
          })

          // Update review counts
          setReviews((prev) =>
            prev.map((review) => {
              if (review && review.id === reviewId) {
                return {
                  ...review,
                  likes: reactionType === "like" ? Math.max(0, (review.likes || 0) - 1) : review.likes || 0,
                  dislikes: reactionType === "dislike" ? Math.max(0, (review.dislikes || 0) - 1) : review.dislikes || 0,
                }
              }
              return review
            }),
          )

          // Remove reaction in database
          await reviewsService.removeReviewReaction(reviewId, user.id)
        } else {
          // Add or change reaction
          setUserReactions((prev) => ({
            ...prev,
            [`review_${reviewId}`]: reactionType,
          }))

          // Update review counts
          setReviews((prev) =>
            prev.map((review) => {
              if (review && review.id === reviewId) {
                let newLikes = review.likes || 0
                let newDislikes = review.dislikes || 0

                // Remove previous reaction count if any
                if (existingReaction === "like") newLikes = Math.max(0, newLikes - 1)
                if (existingReaction === "dislike") newDislikes = Math.max(0, newDislikes - 1)

                // Add new reaction count
                if (reactionType === "like") newLikes++
                if (reactionType === "dislike") newDislikes++

                return {
                  ...review,
                  likes: newLikes,
                  dislikes: newDislikes,
                }
              }
              return review
            }),
          )

          // Update reaction in database
          await reviewsService.upsertReviewReaction(reviewId, user.id, reactionType)
        }
      } catch (error) {
        console.error("Error reacting to review:", error)
      }
    },
    [user, userReactions],
  )

  // React to a comment
  const reactToComment = useCallback(
    async (commentId: number, reactionType: string) => {
      if (!user || !commentId) return

      try {
        // Check if user already reacted with this type
        const existingReaction = userReactions[`comment_${commentId}`]

        // Optimistically update UI
        if (existingReaction === reactionType) {
          // Remove reaction if clicking the same one
          setUserReactions((prev) => {
            const newReactions = { ...prev }
            delete newReactions[`comment_${commentId}`]
            return newReactions
          })

          // Update comment counts in comments state
          setComments((prev) => {
            const updatedComments = { ...prev }

            // Look through all comments to find the one to update
            Object.keys(updatedComments).forEach((reviewIdKey) => {
              const reviewId = Number(reviewIdKey)

              // Update main comments
              updatedComments[reviewId] = (updatedComments[reviewId] || []).map((comment) => {
                if (comment && comment.id === commentId) {
                  return {
                    ...comment,
                    likes: reactionType === "like" ? Math.max(0, (comment.likes || 0) - 1) : comment.likes || 0,
                    dislikes:
                      reactionType === "dislike" ? Math.max(0, (comment.dislikes || 0) - 1) : comment.dislikes || 0,
                  }
                }

                // Check for the comment in replies
                if (comment && comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: comment.replies.map((reply) => {
                      if (reply && reply.id === commentId) {
                        return {
                          ...reply,
                          likes: reactionType === "like" ? Math.max(0, (reply.likes || 0) - 1) : reply.likes || 0,
                          dislikes:
                            reactionType === "dislike" ? Math.max(0, (reply.dislikes || 0) - 1) : reply.dislikes || 0,
                        }
                      }
                      return reply
                    }),
                  }
                }

                return comment
              })
            })

            return updatedComments
          })

          // Remove reaction in database
          await reviewsService.removeCommentReaction(commentId, user.id)
        } else {
          // Add or change reaction
          setUserReactions((prev) => ({
            ...prev,
            [`comment_${commentId}`]: reactionType,
          }))

          // Update comment counts in comments state
          setComments((prev) => {
            const updatedComments = { ...prev }

            // Look through all comments to find the one to update
            Object.keys(updatedComments).forEach((reviewIdKey) => {
              const reviewId = Number(reviewIdKey)

              // Update main comments
              updatedComments[reviewId] = (updatedComments[reviewId] || []).map((comment) => {
                if (comment && comment.id === commentId) {
                  let newLikes = comment.likes || 0
                  let newDislikes = comment.dislikes || 0

                  // Remove previous reaction count if any
                  if (existingReaction === "like") newLikes = Math.max(0, newLikes - 1)
                  if (existingReaction === "dislike") newDislikes = Math.max(0, newDislikes - 1)

                  // Add new reaction count
                  if (reactionType === "like") newLikes++
                  if (reactionType === "dislike") newDislikes++

                  return {
                    ...comment,
                    likes: newLikes,
                    dislikes: newDislikes,
                  }
                }

                // Check for the comment in replies
                if (comment && comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: comment.replies.map((reply) => {
                      if (reply && reply.id === commentId) {
                        let newLikes = reply.likes || 0
                        let newDislikes = reply.dislikes || 0

                        // Remove previous reaction count if any
                        if (existingReaction === "like") newLikes = Math.max(0, newLikes - 1)
                        if (existingReaction === "dislike") newDislikes = Math.max(0, newDislikes - 1)

                        // Add new reaction count
                        if (reactionType === "like") newLikes++
                        if (reactionType === "dislike") newDislikes++

                        return {
                          ...reply,
                          likes: newLikes,
                          dislikes: newDislikes,
                        }
                      }
                      return reply
                    }),
                  }
                }

                return comment
              })
            })

            return updatedComments
          })

          // Update reaction in database
          await reviewsService.upsertCommentReaction(commentId, user.id, reactionType)
        }
      } catch (error) {
        console.error("Error reacting to comment:", error)
      }
    },
    [user, userReactions],
  )

  // Fetch comments for all reviews
  useEffect(() => {
    if (!authInitialized) return

    reviews.forEach((review) => {
      if (review && review.id) {
        fetchComments(review.id)
      }
    })
  }, [reviews, fetchComments, authInitialized])

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        comments,
        replies,
        isInitialLoading,
        isSubmitting,
        currentUser: user,
        userProfile,
        userReactions,
        commentsLoading,
        fetchReviews,
        fetchComments,
        submitReview,
        submitComment,
        submitCommentReply,
        reactToReview,
        reactToComment,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  )
}
