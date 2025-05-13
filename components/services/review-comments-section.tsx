"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReviewComment } from "./review-comment"
import { CommentSkeleton } from "./comment-skeleton"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials } from "@/lib/data-safety-utils"
import { cn } from "@/lib/utils"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

export const ReviewCommentsSection = memo(function ReviewCommentsSection({
  reviewId,
  serviceId,
}: ReviewCommentsSectionProps) {
  const { comments, commentsLoading, isSubmitting, currentUser, userProfile, fetchComments, submitComment } =
    useReviews()
  const [commentContent, setCommentContent] = useState("")
  const [localSubmitting, setLocalSubmitting] = useState(false)

  // Fetch comments for this review
  useEffect(() => {
    fetchComments(reviewId)
  }, [reviewId, fetchComments])

  // Handle comment submission with optimistic updates
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!commentContent.trim() || !currentUser) return

      setLocalSubmitting(true)
      try {
        const formData = new FormData()
        formData.append("reviewId", String(reviewId))
        formData.append("content", commentContent)
        formData.append("serviceId", String(serviceId))

        // Reset the input field immediately for better UX
        setCommentContent("")

        const result = await submitComment(formData)

        if (!result.success) {
          console.error("Error submitting comment:", result.error)
        }
      } catch (error) {
        console.error("Error submitting comment:", error)
      } finally {
        setLocalSubmitting(false)
      }
    },
    [commentContent, currentUser, reviewId, serviceId, submitComment],
  )

  // Get the comments for this review
  const reviewComments = comments[reviewId] || []
  const isLoading = commentsLoading[reviewId]

  // Get user display name and avatar
  const userDisplayName =
    userProfile?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    "Anonymous"
  const userAvatar = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "/placeholder.svg"

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
              disabled={localSubmitting || isSubmitting}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className={cn(
                  "h-8 text-xs bg-primary hover:bg-primary/90",
                  (localSubmitting || isSubmitting) && "opacity-70",
                )}
                disabled={localSubmitting || isSubmitting || !commentContent.trim()}
              >
                {localSubmitting || isSubmitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {isLoading && reviewComments.length === 0 ? (
        <div className="space-y-4">
          <CommentSkeleton />
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      ) : reviewComments.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewComments.map((comment) => (
            <ReviewComment
              key={`comment-${comment?.id}`}
              comment={comment}
              serviceId={serviceId}
              isOptimistic={comment.isOptimistic}
            />
          ))}
        </div>
      )}
    </div>
  )
})
