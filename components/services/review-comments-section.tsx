"use client"

import type React from "react"
import { useState, useEffect, useCallback, memo, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { ReviewComment } from "./review-comment"
import { CommentSkeleton } from "./comment-skeleton"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials } from "@/lib/data-safety-utils"
import { cn } from "@/lib/utils"
import { MessageSquare } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

// Facebook-like pagination values
const INITIAL_COMMENTS_TO_SHOW = 3
const COMMENTS_BATCH_SIZE = 10
const MAX_TOP_LEVEL_COMMENTS = 50 // Max comments to load before suggesting "View all comments"

type SortOption = "relevant" | "newest" | "oldest"

export const ReviewCommentsSection = memo(function ReviewCommentsSection({
  reviewId,
  serviceId,
}: ReviewCommentsSectionProps) {
  const {
    comments = {},
    commentsLoading = {},
    isSubmitting = false,
    currentUser,
    userProfile,
    submitComment,
    fetchComments,
  } = useReviews()

  // Add direct auth context access as a fallback
  const { user: authUser } = useAuth()

  const [commentContent, setCommentContent] = useState("")
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [commentsToShow, setCommentsToShow] = useState(INITIAL_COMMENTS_TO_SHOW)
  const [sortOption, setSortOption] = useState<SortOption>("relevant")
  const [isComposerFocused, setIsComposerFocused] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasReachedMax, setHasReachedMax] = useState(false)
  const commentsContainerRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle fetch comments safely
  const handleFetchComments = useCallback(
    async (reviewId: number) => {
      try {
        // Check if fetchComments exists in the context
        if (typeof fetchComments === "function") {
          await fetchComments(reviewId)
        }
      } catch (error) {
        console.error("Error fetching comments:", error)
      }
    },
    [fetchComments],
  )

  // Fetch comments for this review
  useEffect(() => {
    if (reviewId) {
      handleFetchComments(reviewId)
    }

    // Clear any existing timeouts on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [reviewId, handleFetchComments])

  // Handle comment submission
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Use either context user or direct auth user
      const user = currentUser || authUser

      if (!commentContent.trim() || !user) return

      setLocalSubmitting(true)
      try {
        const formData = new FormData()
        formData.append("reviewId", String(reviewId))
        formData.append("content", commentContent)
        formData.append("serviceId", String(serviceId))

        // Reset the input field immediately for better UX
        setCommentContent("")
        setIsComposerFocused(false)

        // Only call submitComment if it exists
        if (typeof submitComment === "function") {
          const result = await submitComment(formData)
          if (!result?.success) {
            console.error("Error submitting comment:", result?.error)
          }
        }
      } catch (error) {
        console.error("Error submitting comment:", error)
      } finally {
        setLocalSubmitting(false)
      }
    },
    [commentContent, currentUser, authUser, reviewId, serviceId, submitComment],
  )

  // Load more comments with simulated loading state
  const loadMoreComments = useCallback(() => {
    if (isLoadingMore) return

    setIsLoadingMore(true)

    // Simulate network delay for smoother UX (Facebook-like behavior)
    loadingTimeoutRef.current = setTimeout(() => {
      setCommentsToShow((prev) => {
        const newValue = prev + COMMENTS_BATCH_SIZE
        // Check if we've reached the max comments to show in the standard view
        if (newValue >= MAX_TOP_LEVEL_COMMENTS) {
          setHasReachedMax(true)
        }
        return newValue
      })
      setIsLoadingMore(false)
    }, 500)
  }, [isLoadingMore])

  // View all comments (reset pagination limits)
  const viewAllComments = useCallback(() => {
    setHasReachedMax(false)
    setCommentsToShow(Number.MAX_SAFE_INTEGER) // Show all available comments
  }, [])

  // Get the comments for this review safely
  const reviewComments = useMemo(() => {
    // Safely access comments for this review, returning empty array if undefined
    return Array.isArray(comments[reviewId]) ? comments[reviewId] : []
  }, [comments, reviewId])

  // Safely check loading state
  const isLoading = Boolean(commentsLoading[reviewId])

  // Get total comments count safely
  const totalComments = reviewComments.length

  // Sort comments based on the selected sort option
  const sortedComments = useMemo(() => {
    if (!reviewComments || !reviewComments.length) return []

    return [...reviewComments].sort((a, b) => {
      if (!a || !b) return 0 // Safety check for invalid comments

      try {
        if (sortOption === "newest") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        } else if (sortOption === "oldest") {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        } else if (sortOption === "relevant") {
          // For "relevant", prioritize comments with more likes, fewer dislikes, and more replies (Facebook-like)
          const aRelevance = (a.likes || 0) * 2 - (a.dislikes || 0) + (a.replies?.length || 0) * 1.5
          const bRelevance = (b.likes || 0) * 2 - (b.dislikes || 0) + (b.replies?.length || 0) * 1.5
          return bRelevance - aRelevance
        }
      } catch (error) {
        console.error("Error sorting comments:", error)
      }
      return 0
    })
  }, [reviewComments, sortOption])

  // Visible comments with pagination
  const visibleComments = useMemo(() => {
    if (!sortedComments.length) return []

    try {
      return hasReachedMax ? sortedComments.slice(0, MAX_TOP_LEVEL_COMMENTS) : sortedComments.slice(0, commentsToShow)
    } catch (error) {
      console.error("Error slicing comments:", error)
      return []
    }
  }, [sortedComments, commentsToShow, hasReachedMax])

  const remainingComments = Math.max(0, totalComments - visibleComments.length)
  const hasMoreComments = remainingComments > 0

  // Handle scroll to detect when user reaches bottom of scroll area
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isLoadingMore || !hasMoreComments || hasReachedMax) return

      try {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        // If user is near the bottom (within 150px), load more comments
        if (scrollTop + clientHeight >= scrollHeight - 150) {
          loadMoreComments()
        }
      } catch (error) {
        console.error("Error in scroll handler:", error)
      }
    },
    [hasMoreComments, isLoadingMore, loadMoreComments, hasReachedMax],
  )

  // Focus the comment input
  const focusCommentInput = useCallback(() => {
    if (commentInputRef.current) {
      commentInputRef.current.focus()
    }
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((value: string) => {
    setSortOption(value as SortOption)
    // Reset pagination when sorting changes
    setCommentsToShow(INITIAL_COMMENTS_TO_SHOW)
    setHasReachedMax(false)
  }, [])

  // Get user display name and avatar safely
  const user = currentUser || authUser

  const userDisplayName = useMemo(() => {
    if (!user) return "Anonymous"

    try {
      return (
        userProfile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split("@")[0] : "Anonymous")
      )
    } catch (error) {
      console.error("Error getting display name:", error)
      return "Anonymous"
    }
  }, [user, userProfile])

  const userAvatar = userProfile?.avatar_url || user?.user_metadata?.avatar_url || "/placeholder.svg"

  return (
    <div className="space-y-2 overflow-visible">
      {/* Comment header with count and sort options */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-sm">
          <MessageSquare className="h-4 w-4" />
          <span>
            {totalComments} {totalComments === 1 ? "Comment" : "Comments"}
          </span>
        </div>

        {totalComments > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                {sortOption === "relevant"
                  ? "Most Relevant"
                  : sortOption === "newest"
                    ? "Newest First"
                    : "Oldest First"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuRadioGroup value={sortOption} onValueChange={handleSortChange}>
                <DropdownMenuRadioItem value="relevant">Most Relevant</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Comments list */}
      {isLoading && reviewComments.length === 0 ? (
        <div className="space-y-4">
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      ) : (
        <div className="relative">
          {/* Scrollable comments area */}
          <div
            ref={commentsContainerRef}
            className="space-y-4 max-h-[500px] overflow-y-auto pr-1 pb-4"
            onScroll={handleScroll}
          >
            {visibleComments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No comments yet</p>
                {user && (
                  <Button variant="link" size="sm" onClick={focusCommentInput}>
                    Be the first to comment
                  </Button>
                )}
              </div>
            ) : (
              <>
                {visibleComments.map(
                  (comment) =>
                    comment && (
                      <ReviewComment
                        key={`comment-${comment.id || "unknown"}`}
                        comment={comment}
                        serviceId={serviceId}
                        isOptimistic={Boolean(comment.isOptimistic)}
                      />
                    ),
                )}

                {/* Load more comments UI */}
                {hasMoreComments && (
                  <div className="text-center py-2">
                    {isLoadingMore ? (
                      <div className="flex items-center justify-center py-2">
                        <Spinner size="sm" className="text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Loading comments...</span>
                      </div>
                    ) : hasReachedMax ? (
                      <Button variant="link" size="sm" onClick={viewAllComments}>
                        View all {totalComments} comments
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={loadMoreComments}>
                        View {Math.min(remainingComments, COMMENTS_BATCH_SIZE)} more comments
                        {remainingComments > COMMENTS_BATCH_SIZE && ` (${remainingComments} remaining)`}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky comment composer */}
          {user && (
            <div
              className={cn(
                "sticky bottom-0 bg-background pt-2 pb-1 transition-all duration-200",
                isComposerFocused ? "border-t border-muted" : "",
              )}
            >
              <form onSubmit={handleCommentSubmit} className="flex items-start gap-2">
                <Avatar className="h-8 w-8 mt-1 border shadow-sm flex-shrink-0">
                  <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userDisplayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {safeInitials(userDisplayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 relative">
                  <Textarea
                    ref={commentInputRef}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    onFocus={() => setIsComposerFocused(true)}
                    onBlur={() => !commentContent.trim() && setIsComposerFocused(false)}
                    placeholder="Write a comment..."
                    className={cn(
                      "min-h-[40px] resize-none text-sm rounded-full py-2 px-4 bg-muted/30 transition-all",
                      isComposerFocused ? "min-h-[80px] rounded-xl" : "",
                    )}
                    disabled={localSubmitting || isSubmitting}
                  />

                  {isComposerFocused && (
                    <div className="flex justify-end mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs mr-2"
                        onClick={() => {
                          setIsComposerFocused(false)
                          setCommentContent("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className={cn(
                          "h-8 text-xs bg-primary hover:bg-primary/90",
                          (localSubmitting || isSubmitting) && "opacity-70",
                        )}
                        disabled={localSubmitting || isSubmitting || !commentContent.trim()}
                      >
                        {localSubmitting || isSubmitting ? "Posting..." : "Comment"}
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
