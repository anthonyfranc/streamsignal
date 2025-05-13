"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReviewComment } from "./review-comment"
import { CommentSkeleton } from "./comment-skeleton"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials } from "@/lib/data-safety-utils"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

const COMMENTS_PER_BATCH = 5

export const ReviewCommentsSection = memo(function ReviewCommentsSection({
  reviewId,
  serviceId,
}: ReviewCommentsSectionProps) {
  const { comments, commentsLoading, isSubmitting, currentUser, userProfile, fetchComments, submitComment } =
    useReviews()
  const [commentContent, setCommentContent] = useState("")
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [visibleComments, setVisibleComments] = useState(COMMENTS_PER_BATCH)
  const [loadingMore, setLoadingMore] = useState(false)

  // Refs for infinite scrolling
  const loaderRef = useRef<HTMLDivElement>(null)
  const prevCommentsLengthRef = useRef(0)

  // Fetch comments for this review
  useEffect(() => {
    fetchComments(reviewId)
  }, [reviewId, fetchComments])

  // Reset visible comments when review changes
  useEffect(() => {
    setVisibleComments(COMMENTS_PER_BATCH)
    prevCommentsLengthRef.current = 0
  }, [reviewId])

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

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    const currentLoaderRef = loaderRef.current

    if (!currentLoaderRef) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && !loadingMore && reviewComments.length > visibleComments) {
          setLoadingMore(true)
          // Simulate network delay for smoother UX
          setTimeout(() => {
            setVisibleComments((prev) => prev + COMMENTS_PER_BATCH)
            setLoadingMore(false)
          }, 300)
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(currentLoaderRef)

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef)
      }
    }
  }, [reviewComments.length, visibleComments, loadingMore])

  // Update visible comments when new comments are added
  useEffect(() => {
    if (reviewComments.length > prevCommentsLengthRef.current && prevCommentsLengthRef.current > 0) {
      // If new comments were added, make sure they're visible
      setVisibleComments((prev) => Math.max(prev, reviewComments.length))
    }
    prevCommentsLengthRef.current = reviewComments.length
  }, [reviewComments.length])

  // Get user display name and avatar
  const userDisplayName =
    userProfile?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    "Anonymous"
  const userAvatar = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "/placeholder.svg"

  // Slice comments to show only the visible ones
  const displayedComments = useMemo(() => {
    return reviewComments.slice(0, visibleComments)
  }, [reviewComments, visibleComments])

  // Determine if there are more comments to load
  const hasMoreComments = reviewComments.length > visibleComments

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
          <div className="text-sm text-muted-foreground">
            {reviewComments.length} {reviewComments.length === 1 ? "comment" : "comments"}
          </div>

          <ScrollArea className="max-h-[600px] pr-4">
            <div className="space-y-4">
              {displayedComments.map((comment) => (
                <ReviewComment
                  key={`comment-${comment?.id}`}
                  comment={comment}
                  serviceId={serviceId}
                  isOptimistic={comment.isOptimistic}
                />
              ))}

              {/* Intersection observer target */}
              {hasMoreComments && (
                <div ref={loaderRef} className="py-4 flex justify-center" aria-hidden="true">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading more comments...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
})
