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
      const { data, error } = await supabase
        .from("service_reviews")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error in reviewsService.fetchReviews:", error)
        return { data: [], error }
      }

      console.log(`reviewsService.fetchReviews: Fetched ${data?.length || 0} reviews for service ${serviceId}`)
      return { data, error: null }
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
      return { data, error: null }
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

      console.log(`Successfully fetched ${data?.length || 0} total replies`)
      return { data, error: null }
    } catch (err) {
      console.error("Exception in fetchAllReplies:", err)
      return { data: [], error: err }
    }
  },

  // Rest of the service methods remain unchanged
  /**
   * Fetch user reactions to reviews
   */
  async fetchReviewReactions(userId: string, reviewIds: number[]) {
    return supabase
      .from("review_reactions")
      .select("review_id, reaction_type")
      .eq("user_id", userId)
      .in("review_id", reviewIds)
  },

  /**
   * Fetch user reactions to comments
   */
  async fetchCommentReactions(userId: string) {
    return supabase.from("comment_reactions").select("comment_id, reaction_type").eq("user_id", userId)
  },

  /**
   * Submit a new review
   */
  async submitReview(reviewData: Omit<ServiceReview, "id" | "created_at" | "likes" | "dislikes">) {
    return supabase
      .from("service_reviews")
      .insert({
        ...reviewData,
        likes: 0,
        dislikes: 0,
      })
      .select()
  },

  /**
   * Submit a new comment
   */
  async submitComment(
    commentData: Omit<ReviewComment, "id" | "created_at" | "likes" | "dislikes" | "replies" | "user_reaction">,
  ) {
    return supabase
      .from("review_comments")
      .insert({
        ...commentData,
        likes: 0,
        dislikes: 0,
      })
      .select()
  },

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    return supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle()
  },

  /**
   * Add or update a review reaction
   */
  async upsertReviewReaction(reviewId: number, userId: string, reactionType: string) {
    // Check if user already reacted
    const { data: existingReaction } = await supabase
      .from("review_reactions")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existingReaction) {
      // Update existing reaction
      return supabase.from("review_reactions").update({ reaction_type: reactionType }).eq("id", existingReaction.id)
    } else {
      // Create new reaction
      return supabase.from("review_reactions").insert({
        review_id: reviewId,
        user_id: userId,
        reaction_type: reactionType,
      })
    }
  },

  /**
   * Remove a review reaction
   */
  async removeReviewReaction(reviewId: number, userId: string) {
    return supabase.from("review_reactions").delete().eq("review_id", reviewId).eq("user_id", userId)
  },

  /**
   * Add or update a comment reaction
   */
  async upsertCommentReaction(commentId: number, userId: string, reactionType: string) {
    // Check if user already reacted
    const { data: existingReaction } = await supabase
      .from("comment_reactions")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existingReaction) {
      // Update existing reaction
      return supabase.from("comment_reactions").update({ reaction_type: reactionType }).eq("id", existingReaction.id)
    } else {
      // Create new reaction
      return supabase.from("comment_reactions").insert({
        comment_id: commentId,
        user_id: userId,
        reaction_type: reactionType,
      })
    }
  },

  /**
   * Remove a comment reaction
   */
  async removeCommentReaction(commentId: number, userId: string) {
    return supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", userId)
  },

  /**
   * Update review likes/dislikes count
   */
  async updateReviewReactionCounts(reviewId: number, likes: number, dislikes: number) {
    return supabase.from("service_reviews").update({ likes, dislikes }).eq("id", reviewId)
  },

  /**
   * Update comment likes/dislikes count
   */
  async updateCommentReactionCounts(commentId: number, likes: number, dislikes: number) {
    return supabase.from("review_comments").update({ likes, dislikes }).eq("id", commentId)
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
