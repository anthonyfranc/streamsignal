"use client"

import { useEffect, useState, useCallback } from "react"
import { CommentForm } from "./comment-form"
import { CommentThread } from "./comment-thread"
import { CommentSkeletonList } from "./comment-skeleton"
import { useReviews } from "@/contexts/reviews-context"
import { safeNumber } from "@/lib/data-safety-utils"
import type { ReviewComment } from "@/types/reviews"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

export function ReviewCommentsSection({ reviewId, serviceId }: ReviewCommentsSectionProps) {
  const { comments, fetchComments } = useReviews()
  const [isLoading, setIsLoading] = useState(true)
  const [localComments, setLocalComments] = useState<ReviewComment[]>([])

  // Fetch comments for this review
  useEffect(() => {
    let isMounted = true

    const loadComments = async () => {
      setIsLoading(true)
      try {
        const fetchedComments = await fetchComments(reviewId)

        if (isMounted) {
          setLocalComments(fetchedComments)
        }
      } catch (error) {
        console.error("Error fetching comments:", error)
      } finally {
        if (isMounted) {
          // Add a small delay for smoother transitions
          setTimeout(() => setIsLoading(false), 300)
        }
      }
    }

    loadComments()

    return () => {
      isMounted = false
    }
  }, [reviewId, fetchComments])

  // Update local comments when the global state changes
  useEffect(() => {
    if (comments[reviewId] && !isLoading) {
      setLocalComments(comments[reviewId])
    }
  }, [comments, reviewId, isLoading])

  // Handle when a new comment is submitted
  const handleCommentSubmitted = useCallback((newComment: ReviewComment) => {
    setLocalComments((prev) => [...prev, newComment])
  }, [])

  // Handle when a reply is added to any comment in the thread
  const handleReplyAdded = useCallback((parentId: number, reply: ReviewComment) => {
    // This is handled by the CommentThread component internally
    // We don't need to modify our top-level state for replies
  }, [])

  return (
    <div className="space-y-4">
      {/* Comment form */}
      <CommentForm reviewId={reviewId} serviceId={serviceId} onCommentSubmitted={handleCommentSubmitted} />

      {/* Comments content */}
      {isLoading ? (
        <CommentSkeletonList />
      ) : localComments.length === 0 ? (
        <div className="text-center py-4 animate-in fade-in-0 duration-300">
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {localComments.map((comment) => (
            <CommentThread
              key={safeNumber(comment?.id, 0)}
              comment={comment}
              serviceId={serviceId}
              onReplyAdded={handleReplyAdded}
            />
          ))}
        </div>
      )}
    </div>
  )
}
