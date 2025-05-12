"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { ServiceReview, ReviewComment } from "@/types/reviews"

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

type ReviewsContextType = {
  reviews: ServiceReview[]
  comments: Record<number, ReviewComment[]>
  userReactions: Record<string, string>
  isLoading: boolean
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
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [comments, setComments] = useState<Record<number, ReviewComment[]>>({})
  const [userReactions, setUserReactions] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
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
          // Ensure all reviews have required properties
          const safeReviews = (data || []).map((review) => ({
            ...review,
            author_name: review.author_name || "Anonymous",
            content: review.content || "",
            title: review.title || "Review",
            rating: review.rating || 0,
            likes: review.likes || 0,
            dislikes: review.dislikes || 0,
            created_at: review.created_at || new Date().toISOString(),
          }))

          setReviews(safeReviews)

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
                      newUserReactions[`review_${reaction.review_id}`] = reaction.reaction_type
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
                  userReactionsMap[`comment_${reaction.comment_id}`] = reaction.reaction_type
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
            // Ensure all required properties exist
            const safeComment = {
              ...comment,
              author_name: comment.author_name || "Anonymous",
              content: comment.content || "",
              likes: comment.likes || 0,
              dislikes: comment.dislikes || 0,
              nesting_level: comment.nesting_level || 1,
              created_at: comment.created_at || new Date().toISOString(),
              replies: [],
              user_reaction: userReactionsMap[`comment_${comment.id}`] || null,
            }
            commentMap.set(comment.id, safeComment)
            return safeComment
          }) || []

        // Process replies and build the tree
        allReplies?.forEach((reply) => {
          if (!reply || !reply.id || !reply.parent_comment_id) return

          // Ensure all required properties exist
          const safeReply = {
            ...reply,
            author_name: reply.author_name || "Anonymous",
            content: reply.content || "",
            likes: reply.likes || 0,
            dislikes: reply.dislikes || 0,
            nesting_level: reply.nesting_level || 2,
            created_at: reply.created_at || new Date().toISOString(),
            replies: [],
            user_reaction: userReactionsMap[`comment_${reply.id}`] || null,
          }

          commentMap.set(reply.id, safeReply)

          // Add this reply to its parent's replies array
          if (reply.parent_comment_id && commentMap.has(reply.parent_comment_id)) {
            const parent = commentMap.get(reply.parent_comment_id)
            if (parent && parent.replies) {
              parent.replies.push(safeReply)
            }
          }
        })

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

      const serviceId = Number.parseInt(formData.get("serviceId") as string)
      const rating = Number.parseFloat(formData.get("rating") as string)
      const title = formData.get("title") as string
      const content = formData.get("content") as string
      const interfaceRating = Number.parseFloat((formData.get("interfaceRating") as string) || "0")
      const reliabilityRating = Number.parseFloat((formData.get("reliabilityRating") as string) || "0")
      const contentRating = Number.parseFloat((formData.get("contentRating") as string) || "0")
      const valueRating = Number.parseFloat((formData.get("valueRating") as string) || "0")

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar = userProfile?.avatar_url || currentUser.user_metadata?.avatar_url || null

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

        // Update reviews state with the new review
        if (data && data[0]) {
          setReviews((prev) => [data[0], ...prev])
        }

        return { success: true }
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

      const reviewId = Number.parseInt(formData.get("reviewId") as string)
      const content = formData.get("content") as string

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar = userProfile?.avatar_url || currentUser.user_metadata?.avatar_url || null

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

        // Update comments state with the new comment
        if (data && data[0]) {
          const newComment = {
            ...data[0],
            replies: [],
            user_reaction: null,
          }

          setComments((prev) => {
            const existingComments = prev[reviewId] || []
            return {
              ...prev,
              [reviewId]: [...existingComments, newComment],
            }
          })
        }

        return { success: true }
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

      const parentCommentId = Number.parseInt(formData.get("parentCommentId") as string)
      const content = formData.get("content") as string
      const nestingLevel = Number.parseInt(formData.get("nestingLevel") as string) + 1

      // Check if we've reached maximum nesting level
      if (nestingLevel > 3) {
        return { success: false, error: "Maximum reply depth reached" }
      }

      try {
        // Get display name from user_profiles or metadata
        const authorName = getDisplayNameFromData(currentUser, userProfile)

        // Get avatar URL from user_profiles or metadata
        const authorAvatar = userProfile?.avatar_url || currentUser.user_metadata?.avatar_url || null

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

        // Find the review ID for this comment
        let reviewId: number | null = null
        for (const [revId, commentsList] of Object.entries(comments)) {
          const findParentComment = (commentList: ReviewComment[]): boolean => {
            for (const comment of commentList) {
              if (comment.id === parentCommentId) {
                reviewId = Number.parseInt(revId)
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

        if (reviewId && data && data[0]) {
          // Update the comments state by adding the reply to the parent comment
          const newReply = {
            ...data[0],
            replies: [],
            user_reaction: null,
          }

          setComments((prev) => {
            const updateReplies = (commentList: ReviewComment[]): ReviewComment[] => {
              return commentList.map((comment) => {
                if (comment.id === parentCommentId) {
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
              [reviewId!]: updateReplies(prev[reviewId!] || []),
            }
          })
        }

        return { success: true }
      } catch (error) {
        console.error("Error submitting reply:", error)
        return { success: false, error: "Failed to submit reply" }
      }
    },
    [currentUser, userProfile, comments],
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
              let likes = review.likes || 0
              let dislikes = review.dislikes || 0

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
          let likes = review.likes || 0
          let dislikes = review.dislikes || 0

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

  // React to a comment (like/dislike)
  const reactToComment = useCallback(
    async (commentId: number, reactionType: string) => {
      if (!currentUser) return

      try {
        // Optimistic update
        const currentReaction = userReactions[`comment_${commentId}`]
        const isRemovingReaction = currentReaction === reactionType

        // Update UI immediately
        setUserReactions((prev) => ({
          ...prev,
          [`comment_${commentId}`]: isRemovingReaction ? null : reactionType,
        }))

        // Update comments state
        setComments((prev) => {
          const updateCommentReaction = (commentList: ReviewComment[]): ReviewComment[] => {
            return commentList.map((comment) => {
              if (comment.id === commentId) {
                let likes = comment.likes || 0
                let dislikes = comment.dislikes || 0

                // Remove previous reaction if exists
                if (currentReaction === "like") likes = Math.max(0, likes - 1)
                if (currentReaction === "dislike") dislikes = Math.max(0, dislikes - 1)

                // Add new reaction if not removing
                if (!isRemovingReaction) {
                  if (reactionType === "like") likes++
                  if (reactionType === "dislike") dislikes++
                }

                return {
                  ...comment,
                  likes,
                  dislikes,
                  user_reaction: isRemovingReaction ? null : reactionType,
                }
              }
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentReaction(comment.replies),
                }
              }
              return comment
            })
          }

          const updatedComments = { ...prev }
          for (const reviewId in updatedComments) {
            updatedComments[reviewId] = updateCommentReaction(updatedComments[reviewId])
          }
          return updatedComments
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
          let likes = comment.likes || 0
          let dislikes = comment.dislikes || 0

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
        // No need to revert optimistic update as it would cause a full re-render
      }
    },
    [currentUser, userReactions, comments],
  )

  const value: ReviewsContextType = {
    reviews,
    comments,
    userReactions,
    isLoading,
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
