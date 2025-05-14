"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
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
  fetchReviews: (serviceId: number) => Promise<void>
  submitReview: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  submitComment: (
    reviewId: number,
    content: string,
    parentCommentId?: number,
  ) => Promise<{
    success: boolean
    error?: string
    comment?: ReviewComment
  }>
  reactToReview: (reviewId: number, reactionType: string) => Promise<void>
  reactToComment: (commentId: number, reactionType: string) => Promise<void>
}

const ReviewsContext = createContext<ReviewsContextType>({
  reviews: [],
  comments: {},
  replies: {},
  isInitialLoading: true,
  isSubmitting: false,
  currentUser: null,
  userProfile: null,
  userReactions: {},
  fetchReviews: async () => {},
  submitReview: async () => ({ success: false }),
  submitComment: async () => ({ success: false }),
  reactToReview: async () => {},
  reactToComment: async () => {},
})

export const useReviews = () => useContext(ReviewsContext)

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile, isLoading: isAuthLoading } = useAuth()
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [comments, setComments] = useState<Record<number, ReviewComment[]>>({})
  const [replies, setReplies] = useState<Record<number, ReviewComment[]>>({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userReactions, setUserReactions] = useState<Record<string, string>>({})
  const [authInitialized, setAuthInitialized] = useState(false)

  // Wait for auth to be initialized before proceeding
  useEffect(() => {
    if (!isAuthLoading && !authInitialized) {
      setAuthInitialized(true)
    }
  }, [isAuthLoading, authInitialized])

  // Fetch reviews for a service
  const fetchReviews = useCallback(
    async (serviceId: number) => {
      if (!serviceId) return

      try {
        setIsInitialLoading(true)
        const { data: reviewsData, error: reviewsError } = await reviewsService.fetchReviews(serviceId)

        if (reviewsError) {
          console.error("Error fetching reviews:", reviewsError)
          return
        }

        setReviews(reviewsData || [])

        // Fetch user reactions if user is logged in
        if (user) {
          const reviewIds = (reviewsData || []).map((review) => review.id).filter(Boolean)

          if (reviewIds.length > 0) {
            const { data: reactionsData, error: reactionsError } = await reviewsService.fetchReviewReactions(
              user.id,
              reviewIds as number[],
            )

            if (!reactionsError && reactionsData) {
              const reactionsMap: Record<string, string> = {}
              reactionsData.forEach((reaction) => {
                reactionsMap[`review_${reaction.review_id}`] = reaction.reaction_type
              })
              setUserReactions(reactionsMap)
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

        if (!rating || !title.trim() || !content.trim()) {
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
        setReviews((prev) =>
          prev.map((review) => (review.id === optimisticReview.id ? { ...data[0], isOptimistic: false } : review)),
        )

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
    async (reviewId: number, content: string, parentCommentId?: number) => {
      if (!user) {
        return { success: false, error: "You must be logged in to submit a comment" }
      }

      if (!content.trim()) {
        return { success: false, error: "Comment content is required" }
      }

      try {
        setIsSubmitting(true)

        // Create comment data
        const commentData = {
          review_id: parentCommentId ? null : reviewId,
          parent_comment_id: parentCommentId || null,
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

        if (parentCommentId) {
          // Add as a reply
          setReplies((prev) => ({
            ...prev,
            [parentCommentId]: [...(prev[parentCommentId] || []), optimisticComment],
          }))
        } else {
          // Add as a top-level comment
          setComments((prev) => ({
            ...prev,
            [reviewId]: [...(prev[reviewId] || []), optimisticComment],
          }))
        }

        // Submit to server
        const { data, error } = await reviewsService.submitComment(commentData)

        if (error) {
          // Remove optimistic comment on error
          if (parentCommentId) {
            setReplies((prev) => ({
              ...prev,
              [parentCommentId]: (prev[parentCommentId] || []).filter((comment) => comment.id !== optimisticComment.id),
            }))
          } else {
            setComments((prev) => ({
              ...prev,
              [reviewId]: (prev[reviewId] || []).filter((comment) => comment.id !== optimisticComment.id),
            }))
          }
          return { success: false, error: error.message }
        }

        // Replace optimistic comment with real one
        const realComment = { ...data[0], replies: [], isOptimistic: false }

        if (parentCommentId) {
          setReplies((prev) => ({
            ...prev,
            [parentCommentId]: (prev[parentCommentId] || []).map((comment) =>
              comment.id === optimisticComment.id ? realComment : comment,
            ),
          }))
        } else {
          setComments((prev) => ({
            ...prev,
            [reviewId]: (prev[reviewId] || []).map((comment) =>
              comment.id === optimisticComment.id ? realComment : comment,
            ),
          }))
        }

        return { success: true, comment: realComment }
      } catch (error) {
        console.error("Exception submitting comment:", error)
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
      if (!user) return

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
              if (review.id === reviewId) {
                return {
                  ...review,
                  likes: reactionType === "like" ? Math.max(0, review.likes - 1) : review.likes,
                  dislikes: reactionType === "dislike" ? Math.max(0, review.dislikes - 1) : review.dislikes,
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
              if (review.id === reviewId) {
                let newLikes = review.likes
                let newDislikes = review.dislikes

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
      if (!user) return

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

          // Update comment counts in both comments and replies
          setComments((prev) => {
            const newComments = { ...prev }
            Object.keys(newComments).forEach((reviewId) => {
              newComments[Number(reviewId)] = newComments[Number(reviewId)].map((comment) => {
                if (comment.id === commentId) {
                  return {
                    ...comment,
                    likes: reactionType === "like" ? Math.max(0, comment.likes - 1) : comment.likes,
                    dislikes: reactionType === "dislike" ? Math.max(0, comment.dislikes - 1) : comment.dislikes,
                  }
                }
                return comment
              })
            })
            return newComments
          })

          setReplies((prev) => {
            const newReplies = { ...prev }
            Object.keys(newReplies).forEach((parentId) => {
              newReplies[Number(parentId)] = newReplies[Number(parentId)].map((reply) => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    likes: reactionType === "like" ? Math.max(0, reply.likes - 1) : reply.likes,
                    dislikes: reactionType === "dislike" ? Math.max(0, reply.dislikes - 1) : reply.dislikes,
                  }
                }
                return reply
              })
            })
            return newReplies
          })

          // Remove reaction in database
          await reviewsService.removeCommentReaction(commentId, user.id)
        } else {
          // Add or change reaction
          setUserReactions((prev) => ({
            ...prev,
            [`comment_${commentId}`]: reactionType,
          }))

          // Update comment counts in both comments and replies
          setComments((prev) => {
            const newComments = { ...prev }
            Object.keys(newComments).forEach((reviewId) => {
              newComments[Number(reviewId)] = newComments[Number(reviewId)].map((comment) => {
                if (comment.id === commentId) {
                  let newLikes = comment.likes
                  let newDislikes = comment.dislikes

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
                return comment
              })
            })
            return newComments
          })

          setReplies((prev) => {
            const newReplies = { ...prev }
            Object.keys(newReplies).forEach((parentId) => {
              newReplies[Number(parentId)] = newReplies[Number(parentId)].map((reply) => {
                if (reply.id === commentId) {
                  let newLikes = reply.likes
                  let newDislikes = reply.dislikes

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
              })
            })
            return newReplies
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

  // Fetch comments for a review
  const fetchComments = useCallback(
    async (reviewId: number) => {
      if (!reviewId || comments[reviewId]) return

      try {
        const { data, error } = await reviewsService.fetchTopLevelComments(reviewId)

        if (error) {
          console.error("Error fetching comments:", error)
          return
        }

        setComments((prev) => ({
          ...prev,
          [reviewId]: data || [],
        }))

        // Fetch user reactions to comments if user is logged in
        if (user && data && data.length > 0) {
          const commentIds = data.map((comment) => comment.id)
          const { data: reactionsData, error: reactionsError } = await reviewsService.fetchCommentReactions(user.id)

          if (!reactionsError && reactionsData) {
            const filteredReactions = reactionsData.filter((reaction) => commentIds.includes(reaction.comment_id))

            if (filteredReactions.length > 0) {
              setUserReactions((prev) => {
                const newReactions = { ...prev }
                filteredReactions.forEach((reaction) => {
                  newReactions[`comment_${reaction.comment_id}`] = reaction.reaction_type
                })
                return newReactions
              })
            }
          }
        }
      } catch (error) {
        console.error("Exception fetching comments:", error)
      }
    },
    [comments, user],
  )

  // Fetch replies for a comment
  const fetchReplies = useCallback(
    async (commentId: number) => {
      if (!commentId || replies[commentId]) return

      try {
        const { data, error } = await reviewsService.fetchReplies(commentId)

        if (error) {
          console.error("Error fetching replies:", error)
          return
        }

        setReplies((prev) => ({
          ...prev,
          [commentId]: data || [],
        }))

        // Fetch user reactions to replies if user is logged in
        if (user && data && data.length > 0) {
          const replyIds = data.map((reply) => reply.id)
          const { data: reactionsData, error: reactionsError } = await reviewsService.fetchCommentReactions(user.id)

          if (!reactionsError && reactionsData) {
            const filteredReactions = reactionsData.filter((reaction) => replyIds.includes(reaction.comment_id))

            if (filteredReactions.length > 0) {
              setUserReactions((prev) => {
                const newReactions = { ...prev }
                filteredReactions.forEach((reaction) => {
                  newReactions[`comment_${reaction.comment_id}`] = reaction.reaction_type
                })
                return newReactions
              })
            }
          }
        }
      } catch (error) {
        console.error("Exception fetching replies:", error)
      }
    },
    [replies, user],
  )

  // Fetch comments for all reviews
  useEffect(() => {
    if (!authInitialized) return

    reviews.forEach((review) => {
      if (review.id) {
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
        fetchReviews,
        submitReview,
        submitComment,
        reactToReview,
        reactToComment,
      }}
    >
      {children}
    </ReviewsContext.Provider>
  )
}
