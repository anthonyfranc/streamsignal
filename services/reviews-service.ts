import { supabase } from "@/lib/supabase"
import type { ServiceReview, ReviewComment } from "@/types/reviews"

/**
 * Service for handling review-related API calls
 */
export const reviewsService = {
  /**
   * Fetch reviews for a specific service
   */
  async fetchReviews(serviceId: number) {
    console.log(`reviewsService.fetchReviews: Fetching reviews for service ${serviceId}`)
    try {
      // Add a small delay to ensure the database has time to process any recent changes
      await new Promise((resolve) => setTimeout(resolve, 100))

      const { data, error } = await supabase
        .from("service_reviews")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error in reviewsService.fetchReviews:", error)
        return { data: [], error }
      }

      // Ensure data is an array
      const safeData = Array.isArray(data) ? data : []

      console.log(`reviewsService.fetchReviews: Fetched ${safeData.length} reviews for service ${serviceId}`)

      // Log the first review for debugging
      if (safeData.length > 0) {
        console.log(`First review: ID=${safeData[0].id}, Title=${safeData[0].title}`)
      }

      return { data: safeData, error: null }
    } catch (err) {
      console.error("Exception in reviewsService.fetchReviews:", err)
      return { data: [], error: err }
    }
  },

  /**
   * Fetch top-level comments for a review
   */
  async fetchTopLevelComments(reviewId: number) {
    console.log(`Fetching top-level comments for review ${reviewId}`)
    try {
      const { data, error } = await supabase
        .from("review_comments")
        .select("*")
        .eq("review_id", reviewId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching top-level comments:", error)
        return { data: [], error }
      }

      console.log(`Fetched ${data?.length || 0} top-level comments for review ${reviewId}`)

      // Ensure data is an array
      const safeData = Array.isArray(data) ? data : []

      return { data: safeData, error: null }
    } catch (err) {
      console.error("Exception in fetchTopLevelComments:", err)
      return { data: [], error: err }
    }
  },

  /**
   * Fetch all replies (comments with parent_comment_id)
   * CRITICAL FIX: The previous query was incorrect and filtering out nested replies
   */
  async fetchAllReplies() {
    console.log("Fetching all comment replies")
    try {
      // FIXED: Removed the incorrect filter that was excluding nested replies
      const { data, error } = await supabase
        .from("review_comments")
        .select("*")
        .not("parent_comment_id", "is", null) // Get ALL comments that have a parent (are replies)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching all replies:", error)
        return { data: [], error }
      }

      // Ensure data is an array
      const safeData = Array.isArray(data) ? data : []

      console.log(`Successfully fetched ${safeData.length} total replies`)
      return { data: safeData, error: null }
    } catch (err) {
      console.error("Exception in fetchAllReplies:", err)
      return { data: [], error: err }
    }
  },

  /**
   * Fetch user reactions to reviews
   */
  async fetchReviewReactions(userId: string, reviewIds: number[]) {
    if (!userId || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      console.log("Invalid parameters for fetchReviewReactions")
      return { data: [], error: null }
    }

    try {
      const { data, error } = await supabase
        .from("review_reactions")
        .select("review_id, reaction_type")
        .eq("user_id", userId)
        .in("review_id", reviewIds)

      if (error) {
        console.error("Error fetching review reactions:", error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error("Exception in fetchReviewReactions:", err)
      return { data: [], error: err }
    }
  },

  /**
   * Fetch user reactions to comments
   */
  async fetchCommentReactions(userId: string) {
    if (!userId) {
      console.log("Invalid userId for fetchCommentReactions")
      return { data: [], error: null }
    }

    try {
      const { data, error } = await supabase
        .from("comment_reactions")
        .select("comment_id, reaction_type")
        .eq("user_id", userId)

      if (error) {
        console.error("Error fetching comment reactions:", error)
        return { data: [], error }
      }

      return { data: data || [], error: null }
    } catch (err) {
      console.error("Exception in fetchCommentReactions:", err)
      return { data: [], error: err }
    }
  },

  /**
   * Submit a new review
   */
  async submitReview(reviewData: Omit<ServiceReview, "id" | "created_at" | "likes" | "dislikes">) {
    if (!reviewData || !reviewData.service_id || !reviewData.user_id) {
      console.error("Invalid review data:", reviewData)
      return { data: null, error: new Error("Invalid review data") }
    }

    try {
      const { data, error } = await supabase
        .from("service_reviews")
        .insert({
          ...reviewData,
          likes: 0,
          dislikes: 0,
        })
        .select()

      if (error) {
        console.error("Error submitting review:", error)
        return { data: null, error }
      }

      console.log("Successfully submitted review:", data?.[0]?.id)
      return { data, error: null }
    } catch (err) {
      console.error("Exception in submitReview:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Submit a new comment
   */
  async submitComment(
    commentData: Omit<ReviewComment, "id" | "created_at" | "likes" | "dislikes" | "replies" | "user_reaction">,
  ) {
    if (!commentData || (!commentData.review_id && !commentData.parent_comment_id) || !commentData.user_id) {
      console.error("Invalid comment data:", commentData)
      return { data: null, error: new Error("Invalid comment data") }
    }

    try {
      const { data, error } = await supabase
        .from("review_comments")
        .insert({
          ...commentData,
          likes: 0,
          dislikes: 0,
        })
        .select()

      if (error) {
        console.error("Error submitting comment:", error)
        return { data: null, error }
      }

      console.log("Successfully submitted comment:", data?.[0]?.id)
      return { data, error: null }
    } catch (err) {
      console.error("Exception in submitComment:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    if (!userId) {
      console.log("Invalid userId for getUserProfile")
      return { data: null, error: null }
    }

    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle()

      if (error) {
        console.error("Error fetching user profile:", error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error("Exception in getUserProfile:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Add or update a review reaction
   */
  async upsertReviewReaction(reviewId: number, userId: string, reactionType: string) {
    if (!reviewId || !userId || !reactionType) {
      console.error("Invalid parameters for upsertReviewReaction")
      return { data: null, error: new Error("Invalid parameters") }
    }

    try {
      // Check if user already reacted
      const { data: existingReaction, error: checkError } = await supabase
        .from("review_reactions")
        .select("*")
        .eq("review_id", reviewId)
        .eq("user_id", userId)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking existing reaction:", checkError)
        return { data: null, error: checkError }
      }

      if (existingReaction) {
        // Update existing reaction
        const { data, error } = await supabase
          .from("review_reactions")
          .update({ reaction_type: reactionType })
          .eq("id", existingReaction.id)
          .select()

        if (error) {
          console.error("Error updating reaction:", error)
          return { data: null, error }
        }

        return { data, error: null }
      } else {
        // Create new reaction
        const { data, error } = await supabase
          .from("review_reactions")
          .insert({
            review_id: reviewId,
            user_id: userId,
            reaction_type: reactionType,
          })
          .select()

        if (error) {
          console.error("Error creating reaction:", error)
          return { data: null, error }
        }

        return { data, error: null }
      }
    } catch (err) {
      console.error("Exception in upsertReviewReaction:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Remove a review reaction
   */
  async removeReviewReaction(reviewId: number, userId: string) {
    if (!reviewId || !userId) {
      console.error("Invalid parameters for removeReviewReaction")
      return { data: null, error: new Error("Invalid parameters") }
    }

    try {
      const { data, error } = await supabase
        .from("review_reactions")
        .delete()
        .eq("review_id", reviewId)
        .eq("user_id", userId)
        .select()

      if (error) {
        console.error("Error removing review reaction:", error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error("Exception in removeReviewReaction:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Add or update a comment reaction
   */
  async upsertCommentReaction(commentId: number, userId: string, reactionType: string) {
    if (!commentId || !userId || !reactionType) {
      console.error("Invalid parameters for upsertCommentReaction")
      return { data: null, error: new Error("Invalid parameters") }
    }

    try {
      // Check if user already reacted
      const { data: existingReaction, error: checkError } = await supabase
        .from("comment_reactions")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking existing comment reaction:", checkError)
        return { data: null, error: checkError }
      }

      if (existingReaction) {
        // Update existing reaction
        const { data, error } = await supabase
          .from("comment_reactions")
          .update({ reaction_type: reactionType })
          .eq("id", existingReaction.id)
          .select()

        if (error) {
          console.error("Error updating comment reaction:", error)
          return { data: null, error }
        }

        return { data, error: null }
      } else {
        // Create new reaction
        const { data, error } = await supabase
          .from("comment_reactions")
          .insert({
            comment_id: commentId,
            user_id: userId,
            reaction_type: reactionType,
          })
          .select()

        if (error) {
          console.error("Error creating comment reaction:", error)
          return { data: null, error }
        }

        return { data, error: null }
      }
    } catch (err) {
      console.error("Exception in upsertCommentReaction:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Remove a comment reaction
   */
  async removeCommentReaction(commentId: number, userId: string) {
    if (!commentId || !userId) {
      console.error("Invalid parameters for removeCommentReaction")
      return { data: null, error: new Error("Invalid parameters") }
    }

    try {
      const { data, error } = await supabase
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .select()

      if (error) {
        console.error("Error removing comment reaction:", error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error("Exception in removeCommentReaction:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Update review likes/dislikes count
   */
  async updateReviewReactionCounts(reviewId: number, likes: number, dislikes: number) {
    if (!reviewId || likes < 0 || dislikes < 0) {
      console.error("Invalid parameters for updateReviewReactionCounts")
      return { data: null, error: new Error("Invalid parameters") }
    }

    try {
      const { data, error } = await supabase
        .from("service_reviews")
        .update({ likes, dislikes })
        .eq("id", reviewId)
        .select()

      if (error) {
        console.error("Error updating review reaction counts:", error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error("Exception in updateReviewReactionCounts:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Update comment likes/dislikes count
   */
  async updateCommentReactionCounts(commentId: number, likes: number, dislikes: number) {
    if (!commentId || likes < 0 || dislikes < 0) {
      console.error("Invalid parameters for updateCommentReactionCounts")
      return { data: null, error: new Error("Invalid parameters") }
    }

    try {
      const { data, error } = await supabase
        .from("review_comments")
        .update({ likes, dislikes })
        .eq("id", commentId)
        .select()

      if (error) {
        console.error("Error updating comment reaction counts:", error)
        return { data: null, error }
      }

      return { data, error: null }
    } catch (err) {
      console.error("Exception in updateCommentReactionCounts:", err)
      return { data: null, error: err }
    }
  },

  /**
   * Get current user session
   */
  async getCurrentUser() {
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
  },
}
