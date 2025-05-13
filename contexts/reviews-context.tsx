"use client"

import type React from "react"
import { createContext, useContext, useEffect, useCallback } from "react"
import { useAuthUser } from "@/hooks/use-auth-user"
import { useReviewsData } from "@/hooks/use-reviews-data"
import { reviewsService } from "@/services/reviews-service"
import {
  processSafeReview,
  processSafeComment,
  getDisplayNameFromData,
  buildCommentTree,
  updateCommentTreeWithReply,
  replaceCommentInTree,
  removeCommentFromTree,
  updateCommentReactionInTree,
} from "@/utils/review-utils"
import { safeString, safeNumber, safeGet } from "@/lib/data-safety-utils"
import type { ServiceReview, ReviewComment } from "@/types/reviews"
import { supabase } from "@/lib/supabase-client"

type ReviewsContextType = {
  reviews: ServiceReview[]
  comments: Record<number, ReviewComment[]>
  userReactions: Record<string, string>
  isInitialLoading: boolean
  isSubmitting: boolean
  commentsLoading: Record<number, boolean>
  currentUser: any | null
  userProfile: any | null
  fetchReviews: (serviceId: number) => Promise<void>
  fetchComments: (reviewId: number) => Promise<ReviewComment[]>
  submitReview: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  submitComment: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  submitReply: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  reactToReview: (reviewId: number, reactionType: string) => Promise<void>
  reactToComment: (commentId: number, reactionType: string) => Promise<void>
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined)

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  // Use custom hooks for state management
  const { currentUser, userProfile } = useAuthUser()
  const {
    reviews,
    setReviews,
    comments,
    setComments,
    userReactions,
    setUserReactions,
    isInitialLoading,
    setIsInitialLoading,
    isSubmitting,
    setIsSubmitting,
    commentsLoading,
    setCommentsLoading,
    fetchedReviewsRef,
    fetchedCommentsRef,
    resetFetchedState,
  } = useReviewsData()

  // Reset fetched state when current user changes
  useEffect(() => {
    resetFetchedState()
  }, [currentUser, resetFetchedState])

  // Fetch reviews for a service
  const fetchReviews = useCallback(
    async (serviceId: number) => {
      // Skip if we've already fetched this service's reviews
      if (fetchedReviewsRef.current[serviceId]) {
        return
      }

      // Only set loading state for initial fetch
      if (!fetchedReviewsRef.current[serviceId]) {
        setIsInitialLoading(true)
      }

      try {
        const { data, error } = await reviewsService.fetchReviews(serviceId)

        if (error) {
          console.error("Error fetching reviews:", error)
          setReviews([])
        } else {
          // Process reviews to ensure all required fields exist
          const safeReviews = (data || []).map((review) => processSafeReview(review))
          setReviews(safeReviews as ServiceReview[])

          // If user is logged in, fetch their reactions to these reviews
          if (currentUser) {
            const reviewIds = safeReviews.map((review) => review.id) || []

            if (reviewIds.length > 0) {
              try {
                const { data: reactions, error: reactionsError } = await reviewsService.fetchReviewReactions(
                  currentUser.id,
                  reviewIds,
                )

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
        setIsInitialLoading(false)
      }
    },
    [currentUser, setReviews, setUserReactions, setIsInitialLoading, fetchedReviewsRef],
  )

  // Fetch comments for a review
  const fetchComments = useCallback(
    async (reviewId: number): Promise<ReviewComment[]> => {
      // Skip if we've already fetched comments for this review
      if (fetchedCommentsRef.current[reviewId]) {
        return comments[reviewId] || []
      }

      // Only set loading state for initial fetch
      if (!fetchedCommentsRef.current[reviewId]) {
        setCommentsLoading((prev) => ({ ...prev, [reviewId]: true }))
      }

      try {
        // Get all top-level comments for this review
        const { data: topLevelComments, error: commentsError } = await reviewsService.fetchTopLevelComments(reviewId)

        if (commentsError) {
          console.error("Error fetching comments:", commentsError)
          return []
        }

        // Get all replies (comments with parent_comment_id)
        const { data: allReplies, error: repliesError } = await reviewsService.fetchAllReplies()

        if (repliesError) {
          console.error("Error fetching replies:", repliesError)
          return topLevelComments || []
        }

        // Get user reactions if logged in
        const userReactionsMap: Record<string, string> = {}

        if (currentUser) {
          try {
            const { data: reactions, error: reactionsError } = await reviewsService.fetchCommentReactions(
              currentUser.id,
            )

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
        const processedTopComments = buildCommentTree(topLevelComments || [], allReplies || [], userReactionsMap)

        // Update comments state
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
        setCommentsLoading((prev) => ({ ...prev, [reviewId]: false }))
      }
    },
    [currentUser, comments, setComments, setUserReactions, setCommentsLoading, fetchedCommentsRef],
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

      setIsSubmitting(true)

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar =
          safeGet(userProfile, "avatar_url", null) || safeGet(currentUser, "user_metadata.avatar_url", null)

        // Create optimistic review
        const optimisticReviewId = `temp-${Date.now()}`
        const optimisticReview: ServiceReview = {
          id: optimisticReviewId,
          service_id: serviceId,
          user_id: currentUser.id,
          author_name: authorName,
          author_avatar: authorAvatar || "/placeholder.svg",
          rating,
          title,
          content,
          interface_rating: interfaceRating > 0 ? interfaceRating : null,
          reliability_rating: reliabilityRating > 0 ? reliabilityRating : null,
          content_rating: contentRating > 0 ? contentRating : null,
          value_rating: valueRating > 0 ? valueRating : null,
          likes: 0,
          dislikes: 0,
          created_at: new Date().toISOString(),
          isOptimistic: true,
        }

        // Update UI optimistically
        setReviews((prev) => [optimisticReview, ...prev])

        const { data, error } = await reviewsService.submitReview({
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
        })

        if (error) {
          console.error("Error submitting review:", error)

          // Remove optimistic review on error
          setReviews((prev) => prev.filter((r) => r.id !== optimisticReviewId))

          return { success: false, error: error.message }
        }

        // Replace optimistic review with real one
        if (data && data[0]) {
          const safeReview = processSafeReview(data[0])
          setReviews((prev) => prev.map((r) => (r.id === optimisticReviewId ? (safeReview as ServiceReview) : r)))
        }

        return { success: true }
      } catch (error) {
        console.error("Error submitting review:", error)
        return { success: false, error: "Failed to submit review" }
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentUser, userProfile, setReviews, setIsSubmitting],
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

      setIsSubmitting(true)

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar =
          safeGet(userProfile, "avatar_url", null) || safeGet(currentUser, "user_metadata.avatar_url", null)

        // Create optimistic comment
        const optimisticCommentId = `temp-${Date.now()}`
        const optimisticComment: ReviewComment = {
          id: optimisticCommentId,
          review_id: reviewId,
          parent_comment_id: null,
          user_id: currentUser.id,
          author_name: authorName,
          author_avatar: authorAvatar || "/placeholder.svg",
          content,
          likes: 0,
          dislikes: 0,
          created_at: new Date().toISOString(),
          nesting_level: 1,
          replies: [],
          user_reaction: null,
          isOptimistic: true, // Flag to identify optimistic updates
        }

        // Update UI optimistically
        setComments((prev) => {
          const existingComments = prev[reviewId] || []
          return {
            ...prev,
            [reviewId]: [...existingComments, optimisticComment],
          }
        })

        // Perform actual API call
        const { data, error } = await reviewsService.submitComment({
          review_id: reviewId,
          parent_comment_id: null,
          user_id: currentUser.id,
          author_name: authorName,
          author_avatar: authorAvatar,
          content,
          nesting_level: 1,
        })

        if (error) {
          console.error("Error submitting comment:", error)

          // Revert optimistic update on error
          setComments((prev) => {
            const existingComments = prev[reviewId] || []
            return {
              ...prev,
              [reviewId]: existingComments.filter((c) => c.id !== optimisticCommentId),
            }
          })

          return { success: false, error: error.message }
        }

        // Replace optimistic comment with real one
        if (data && data[0]) {
          const newComment = processSafeComment(data[0], null) as ReviewComment

          setComments((prev) => {
            const existingComments = prev[reviewId] || []
            return {
              ...prev,
              [reviewId]: existingComments.map((c) => (c.id === optimisticCommentId ? newComment : c)),
            }
          })
        }

        return { success: true }
      } catch (error) {
        console.error("Error submitting comment:", error)
        return { success: false, error: "Failed to submit comment" }
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentUser, userProfile, setComments, setIsSubmitting],
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
      const reviewId = safeNumber(formData.get("reviewId"), 0)

      if (parentCommentId === 0 || !content.trim()) {
        return { success: false, error: "Missing required fields" }
      }

      // Check if we've reached maximum nesting level
      if (nestingLevel > 3) {
        return { success: false, error: "Maximum reply depth reached" }
      }

      setIsSubmitting(true)

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar =
          safeGet(userProfile, "avatar_url", null) || safeGet(currentUser, "user_metadata.avatar_url", null)

        // Create optimistic reply
        const optimisticReplyId = `temp-${Date.now()}`
        const optimisticReply: ReviewComment = {
          id: optimisticReplyId,
          review_id: null,
          parent_comment_id: parentCommentId,
          user_id: currentUser.id,
          author_name: authorName,
          author_avatar: authorAvatar || "/placeholder.svg",
          content,
          likes: 0,
          dislikes: 0,
          created_at: new Date().toISOString(),
          nesting_level: nestingLevel,
          replies: [],
          user_reaction: null,
          isOptimistic: true, // Flag to identify optimistic updates
        }

        // Update UI optimistically
        setComments((prev) => {
          // If we know the reviewId
          if (reviewId) {
            return {
              ...prev,
              [reviewId]: updateCommentTreeWithReply(prev[reviewId] || [], parentCommentId, optimisticReply),
            }
          }

          // Find the review ID for this comment if not provided
          for (const [revId, commentsList] of Object.entries(prev)) {
            let found = false
            const findParentComment = (commentList: ReviewComment[]): boolean => {
              for (const comment of commentList) {
                if (comment.id === parentCommentId) {
                  found = true
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
              return {
                ...prev,
                [revId]: updateCommentTreeWithReply(prev[revId] || [], parentCommentId, optimisticReply),
              }
            }
          }

          return prev
        })

        // Perform actual API call
        const { data, error } = await reviewsService.submitComment({
          review_id: null,
          parent_comment_id: parentCommentId,
          user_id: currentUser.id,
          author_name: authorName,
          author_avatar: authorAvatar,
          content,
          nesting_level: nestingLevel,
        })

        if (error) {
          console.error("Error submitting reply:", error)

          // Revert optimistic update on error
          setComments((prev) => {
            const updatedComments = { ...prev }
            for (const reviewId in updatedComments) {
              updatedComments[reviewId] = removeCommentFromTree(updatedComments[reviewId], optimisticReplyId)
            }
            return updatedComments
          })

          return { success: false, error: error.message }
        }

        // Replace optimistic reply with real one
        if (data && data[0]) {
          const newReply = processSafeComment(data[0], null) as ReviewComment

          setComments((prev) => {
            const updatedComments = { ...prev }
            for (const reviewId in updatedComments) {
              updatedComments[reviewId] = replaceCommentInTree(updatedComments[reviewId], optimisticReplyId, newReply)
            }
            return updatedComments
          })
        }

        return { success: true }
      } catch (error) {
        console.error("Error submitting reply:", error)
        return { success: false, error: "Failed to submit reply" }
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentUser, userProfile, setComments, setIsSubmitting],
  )

  // React to a review (like/dislike)
  const reactToReview = useCallback(
    async (reviewId: number, reactionType: string) => {
      if (!currentUser) return

      try {
        // Optimistic update
        const currentReaction = userReactions[`review_${reviewId}`]
        const isRemovingReaction = currentReaction === reactionType

        // Update UI immediately
        setUserReactions((prev) => ({
          ...prev,
          [`review_${reviewId}`]: isRemovingReaction ? null : reactionType,
        }))

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
          await reviewsService.removeReviewReaction(reviewId, currentUser.id)
        } else {
          // Add or update reaction
          await reviewsService.upsertReviewReaction(reviewId, currentUser.id, reactionType)
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

          await reviewsService.updateReviewReactionCounts(reviewId, likes, dislikes)
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
    [currentUser, userReactions, reviews, setUserReactions, setReviews, fetchReviews, fetchedReviewsRef],
  )

  // React to a comment (like/dislike)
  const reactToComment = useCallback(
    async (commentId: number, reactionType: string) => {
      if (!currentUser) return

      try {
        // Optimistic update
        const currentReaction = userReactions[`comment_${commentId}`]
        const isRemovingReaction = currentReaction === reactionType
        const newReaction = isRemovingReaction ? null : reactionType

        // Update UI immediately
        setUserReactions((prev) => ({
          ...prev,
          [`comment_${commentId}`]: newReaction,
        }))

        // Update comments state
        setComments((prev) => {
          const updatedComments = { ...prev }
          for (const reviewId in updatedComments) {
            updatedComments[reviewId] = updateCommentReactionInTree(
              updatedComments[reviewId],
              commentId,
              currentReaction,
              newReaction,
            )
          }
          return updatedComments
        })

        // Perform actual API call
        if (isRemovingReaction) {
          // Remove reaction
          await reviewsService.removeCommentReaction(commentId, currentUser.id)
        } else {
          // Add or update reaction
          await reviewsService.upsertCommentReaction(commentId, currentUser.id, reactionType)
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

          await reviewsService.updateCommentReactionCounts(commentId, likes, dislikes)
        }
      } catch (error) {
        console.error("Error reacting to comment:", error)
        // No need to revert optimistic update as it would cause a full re-render
      }
    },
    [currentUser, userReactions, setUserReactions, setComments],
  )

  const value: ReviewsContextType = {
    reviews,
    comments,
    userReactions,
    isInitialLoading,
    isSubmitting,
    commentsLoading,
    currentUser,
    userProfile,
    fetchReviews,
    fetchComments,
    submitReview,
    submitComment,
    submitReply,
    reactToReview,
    reactToComment,
  }

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>
}

export function useReviews() {
  const context = useContext(ReviewsContext)
  if (context === undefined) {
    throw new Error("useReviews must be used within a ReviewsProvider")
  }
  return context
}
