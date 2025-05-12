"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReviewComment } from "./review-comment"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials, safeNumber } from "@/lib/data-safety-utils"
import { CommentSkeletonList } from "./comment-skeleton"
import { useTransitionState } from "@/hooks/use-transition-state"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

export function ReviewCommentsSection({ reviewId, serviceId }: ReviewCommentsSectionProps) {
  const { comments, currentUser, userProfile, fetchComments, submitComment } = useReviews()
  const [commentContent, setCommentContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingComment, setIsAddingComment] = useState(false)

  // Get the comments for this review
  const reviewComments = comments[reviewId] || []

  // Use transition state to prevent flashing when comments are updated
  const transitionComments = useTransitionState(reviewComments)

  // Fetch comments for this review
  useEffect(() => {
    const loadComments = async () => {
      setIsLoading(true)
      try {
        await fetchComments(reviewId)
      } catch (error) {
        console.error("Error fetching comments:", error)
      } finally {
        // Add a small delay to make the transition smoother
        setTimeout(() => setIsLoading(false), 300)
      }
    }

    loadComments()
  }, [reviewId, fetchComments])

  // Handle comment submission
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!commentContent.trim() || !currentUser) return

      setIsSubmitting(true)
      setIsAddingComment(true)
      try {
        const formData = new FormData()
        formData.append("reviewId", String(reviewId))
        formData.append("content", commentContent)
        formData.append("serviceId", String(serviceId))

        const result = await submitComment(formData)

        if (result.success) {
          setCommentContent("")
        }
      } catch (error) {
        console.error("Error submitting comment:", error)
      } finally {
        setIsSubmitting(false)
        // Add a small delay to make the transition smoother
        setTimeout(() => setIsAddingComment(false), 500)
      }
    },
    [commentContent, currentUser, reviewId, serviceId, submitComment],
  )

  // Get user display name and avatar
  const userDisplayName = useMemo(() => {
    return (
      userProfile?.display_name ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.user_metadata?.name ||
      "Anonymous"
    )
  }, [userProfile, currentUser])

  const userAvatar = useMemo(() => {
    return userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "/placeholder.svg"
  }, [userProfile, currentUser])

  return (
    <div className="space-y-4">
      {currentUser && (
        <form onSubmit={handleCommentSubmit} className="flex gap-3">
          <Avatar className="h-8 w-8 border shadow-sm flex-shrink-0">
            <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userDisplayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {safeInitials(userDisplayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[60px] resize-none text-sm rounded-xl py-2 bg-muted/30"
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary/90"
                disabled={isSubmitting || !commentContent.trim()}
              >
                {isSubmitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {isLoading ? (
        <CommentSkeletonList />
      ) : transitionComments.length === 0 ? (
        <div className="text-center py-4 animate-in fade-in-0 duration-300">
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div
          className={`space-y-4 ${isAddingComment ? "opacity-70 transition-opacity duration-300" : "transition-opacity duration-300"}`}
        >
          {transitionComments.map((comment) => (
            <ReviewComment key={safeNumber(comment?.id, 0)} comment={comment} serviceId={serviceId} />
          ))}
        </div>
      )}
    </div>
  )
}
