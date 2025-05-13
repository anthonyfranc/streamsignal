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
import { ChevronDown, SortAsc, ThumbsUp, MessageSquare } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

const COMMENTS_PER_PAGE = 5

type SortOption = "newest" | "oldest" | "most_liked"

export const ReviewCommentsSection = memo(function ReviewCommentsSection({
  reviewId,
  serviceId,
}: ReviewCommentsSectionProps) {
  const { comments, commentsLoading, isSubmitting, currentUser, userProfile, fetchComments, submitComment } =
    useReviews()
  const [commentContent, setCommentContent] = useState("")
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [commentsToShow, setCommentsToShow] = useState(COMMENTS_PER_PAGE)
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const commentsContainerRef = useRef<HTMLDivElement>(null)
  const reachedEnd = useRef(false)

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
        } else {
          // Ensure all comments are visible when a new one is added
          const allReviewComments = comments[reviewId] || []
          if (allReviewComments.length > commentsToShow) {
            setCommentsToShow((prev) => Math.max(prev, allReviewComments.length))
          }

          // Scroll to the new comment
          setTimeout(() => {
            if (commentsContainerRef.current) {
              commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight
            }
          }, 100)
        }
      } catch (error) {
        console.error("Error submitting comment:", error)
      } finally {
        setLocalSubmitting(false)
      }
    },
    [commentContent, currentUser, reviewId, serviceId, submitComment, comments, commentsToShow],
  )

  // Load more comments
  const loadMoreComments = useCallback(() => {
    setCommentsToShow((prev) => prev + COMMENTS_PER_PAGE)
  }, [])

  // Get the comments for this review
  const reviewComments = comments[reviewId] || []

  // Sort comments based on the selected sort option
  const sortedComments = useMemo(() => {
    return [...reviewComments].sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortOption === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortOption === "most_liked") {
        return (b.likes || 0) - (a.likes || 0)
      }
      return 0
    })
  }, [reviewComments, sortOption])

  // Visible comments with pagination
  const visibleComments = useMemo(() => {
    return sortedComments.slice(0, commentsToShow)
  }, [sortedComments, commentsToShow])

  const hasMoreComments = reviewComments.length > commentsToShow
  const isLoading = commentsLoading[reviewId]
  const totalComments = reviewComments.length

  // Handle scroll to detect when user reaches bottom of scroll area
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      // If user is near the bottom and hasn't triggered the load more already
      if (scrollTop + clientHeight >= scrollHeight - 50 && !reachedEnd.current && hasMoreComments) {
        reachedEnd.current = true
        loadMoreComments()
      } else if (scrollTop + clientHeight < scrollHeight - 100) {
        reachedEnd.current = false
      }
    },
    [hasMoreComments, loadMoreComments],
  )

  // Get user display name and avatar
  const userDisplayName =
    userProfile?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    "Anonymous"
  const userAvatar = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "/placeholder.svg"

  return (
    <div className="space-y-4 overflow-visible">
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

      {/* Comment controls */}
      {reviewComments.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>
              {totalComments} {totalComments === 1 ? "comment" : "comments"}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <SortAsc className="h-3.5 w-3.5" />
                <span>Sort by: {sortOption.replace("_", " ")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>Sort Comments</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSortOption("newest")}
                className={cn(sortOption === "newest" && "bg-muted")}
              >
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortOption("oldest")}
                className={cn(sortOption === "oldest" && "bg-muted")}
              >
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortOption("most_liked")}
                className={cn(sortOption === "most_liked" && "bg-muted")}
              >
                <ThumbsUp className="h-3.5 w-3.5 mr-2" />
                Most liked
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          {/* The scrollable comments area with proper padding for the fixed status bar */}
          <div
            ref={commentsContainerRef}
            className="max-h-[600px] overflow-y-auto pr-2"
            onScroll={handleScroll}
            style={{ paddingBottom: hasMoreComments ? "40px" : "0" }}
          >
            <div className="space-y-4">
              {visibleComments.map((comment) => (
                <ReviewComment
                  key={`comment-${comment?.id}`}
                  comment={comment}
                  serviceId={serviceId}
                  isOptimistic={comment.isOptimistic}
                />
              ))}
            </div>
          </div>

          {/* Fixed "load more" footer that doesn't overlap with comments */}
          {hasMoreComments && (
            <div className="sticky bottom-0 bg-background pt-2 pb-2 border-t border-muted">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {visibleComments.length} of {totalComments} comments
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 text-xs"
                  onClick={loadMoreComments}
                >
                  <ChevronDown className="h-4 w-4" />
                  <span>Load more</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
