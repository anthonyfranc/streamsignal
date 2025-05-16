"use client"

import type React from "react"
import { useState, useCallback, memo, useRef, useEffect, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReviewComment as ReviewCommentType } from "@/types/reviews"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials } from "@/lib/data-safety-utils"
import { useAuth } from "@/contexts/auth-context"

interface ReviewCommentProps {
  comment: ReviewCommentType
  serviceId: number
  isOptimistic?: boolean
}

// Facebook-like comment display values
const INITIAL_REPLIES_TO_SHOW = 3
const REPLIES_BATCH_SIZE = 5
const MAX_VISIBLE_REPLIES = 15 // After this, we'll show "View all replies"

export const ReviewComment = memo(function ReviewComment({ comment, serviceId, isOptimistic }: ReviewCommentProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [showReplies, setShowReplies] = useState(false)
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(INITIAL_REPLIES_TO_SHOW)
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const [hasReachedMaxReplies, setHasReachedMaxReplies] = useState(false)
  const replyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const newReplyRef = useRef<HTMLDivElement>(null)

  // Early return if comment is invalid
  if (!comment || typeof comment !== "object") {
    console.error("Invalid comment object provided to ReviewComment:", comment)
    return null
  }

  // Safely extract methods and state from context
  const reviewsContext = useReviews()
  const { user: authUser } = useAuth()

  // Get values safely with fallbacks
  const submitCommentReply =
    reviewsContext?.submitCommentReply || ((formData: FormData) => Promise.resolve({ success: false }))
  const reactToComment =
    reviewsContext?.reactToComment || ((commentId: number, reactionType: string) => Promise.resolve())
  const currentUser = reviewsContext?.currentUser
  const userProfile = reviewsContext?.userProfile
  const isSubmitting = reviewsContext?.isSubmitting || false

  // Process replies safely
  const replies = useMemo(() => {
    // Ensure replies is always an array
    if (!Array.isArray(comment.replies)) {
      console.warn(`Comment ${comment.id} has invalid replies:`, comment.replies)
      return []
    }

    // Filter out any invalid replies
    const validReplies = comment.replies.filter((reply) => reply && typeof reply === "object" && reply.id)

    if (validReplies.length !== comment.replies.length) {
      console.warn(
        `Filtered out ${comment.replies.length - validReplies.length} invalid replies for comment ${comment.id}`,
      )
    }

    return validReplies
  }, [comment.id, comment.replies])

  const hasReplies = useMemo(() => replies.length > 0, [replies])
  const replyCount = replies.length

  // Calculate which replies to show
  const visibleReplies = useMemo(() => {
    try {
      if (!showReplies) return []

      return hasReachedMaxReplies ? replies.slice(0, MAX_VISIBLE_REPLIES) : replies.slice(0, visibleRepliesCount)
    } catch (error) {
      console.error("Error calculating visible replies:", error)
      return []
    }
  }, [hasReachedMaxReplies, replies, showReplies, visibleRepliesCount])

  // Add debug log to trace reply rendering
  useEffect(() => {
    if (replies.length > 0) {
      console.log(
        `Comment ${comment.id} has ${replies.length} replies, showing ${visibleReplies.length}, showReplies=${showReplies}`,
      )
    }
  }, [comment.id, replies.length, visibleReplies.length, showReplies])

  // Auto-expand replies for comments with just a few replies
  useEffect(() => {
    if (replies.length > 0 && replies.length <= 3 && !showReplies) {
      setShowReplies(true)
    }
  }, [replies.length, showReplies])

  const remainingReplies = Math.max(0, replyCount - visibleReplies.length)
  const hasMoreReplies = remainingReplies > 0

  // Format date safely
  const formattedDate = useMemo(() => {
    try {
      if (!comment.created_at) return "recently"
      return formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
    } catch (e) {
      console.error("Error formatting date:", e)
      return "unknown time ago"
    }
  }, [comment.created_at])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current)
      }
    }
  }, [])

  // Scroll to new reply when added
  useEffect(() => {
    if (isOptimistic && newReplyRef.current) {
      newReplyRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [isOptimistic])

  // Handle reply submission
  const handleReplySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Use either context user or direct auth user
      const user = currentUser || authUser

      if (!replyContent.trim() || !user || !comment?.id) return

      try {
        const formData = new FormData()
        formData.append("reviewId", String(comment.review_id || ""))
        formData.append("parentCommentId", String(comment.id))
        formData.append("content", replyContent)
        formData.append("serviceId", String(serviceId))

        // Reset the input field immediately for better UX
        setReplyContent("")

        // Close the reply form
        setIsReplying(false)

        // Show replies when a new reply is submitted
        setShowReplies(true)
        // Make sure we'll see the new reply
        setVisibleRepliesCount((prev) => Math.max(prev, replies.length + 1))

        await submitCommentReply(formData)
      } catch (error) {
        console.error("Error submitting reply:", error)
      }
    },
    [replyContent, comment, currentUser, authUser, serviceId, submitCommentReply, replies.length],
  )

  // Handle comment reaction
  const handleReaction = useCallback(
    (reactionType: "like" | "dislike") => {
      // Use either context or direct auth user
      const user = currentUser || authUser

      if (!user || !comment?.id) return
      reactToComment(comment.id, reactionType)
    },
    [comment?.id, currentUser, authUser, reactToComment],
  )

  // Toggle showing replies
  const toggleReplies = useCallback(() => {
    setShowReplies((prev) => !prev)
  }, [])

  // Load more replies with simulated loading state
  const loadMoreReplies = useCallback(() => {
    if (isLoadingReplies) return

    setIsLoadingReplies(true)

    // Simulate network delay for smoother UX (Facebook-like behavior)
    replyTimeoutRef.current = setTimeout(() => {
      setVisibleRepliesCount((prev) => {
        const newValue = prev + REPLIES_BATCH_SIZE
        if (newValue >= MAX_VISIBLE_REPLIES) {
          setHasReachedMaxReplies(true)
        }
        return newValue
      })
      setIsLoadingReplies(false)
    }, 500)
  }, [isLoadingReplies])

  // View all replies
  const viewAllReplies = useCallback(() => {
    setHasReachedMaxReplies(false)
    setVisibleRepliesCount(replyCount)
  }, [replyCount])

  // Get user display name and avatar
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
    <div className={cn("group", isOptimistic && "opacity-70")} ref={isOptimistic ? newReplyRef : undefined}>
      <div className="flex gap-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.author_avatar || "/placeholder.svg"} alt={comment.author_name || "Anonymous"} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {safeInitials(comment.author_name || "Anonymous")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Comment bubble */}
          <div className="bg-muted/40 px-3 py-2 rounded-xl inline-block max-w-full">
            <div className="flex flex-col">
              <span className="font-medium text-sm">{comment.author_name || "Anonymous"}</span>
              <p className="text-sm whitespace-pre-wrap break-words">{comment.content || ""}</p>
            </div>
          </div>

          {/* Comment actions */}
          <div className="flex items-center gap-3 mt-1 text-xs">
            <button
              className={cn(
                "font-medium hover:underline",
                comment.user_reaction === "like" ? "text-primary" : "text-muted-foreground",
              )}
              onClick={() => handleReaction("like")}
              disabled={!user}
            >
              Like
            </button>
            <button
              className={cn(
                "font-medium hover:underline",
                comment.user_reaction === "dislike" ? "text-primary" : "text-muted-foreground",
              )}
              onClick={() => handleReaction("dislike")}
              disabled={!user}
            >
              Dislike
            </button>
            {user && (
              <button
                className="font-medium text-muted-foreground hover:underline"
                onClick={() => setIsReplying(!isReplying)}
              >
                Reply
              </button>
            )}
            <span className="text-muted-foreground">{formattedDate}</span>

            {/* Like count */}
            {((comment.likes || 0) > 0 || (comment.dislikes || 0) > 0) && (
              <div className="flex items-center gap-1 ml-auto">
                {(comment.likes || 0) > 0 && (
                  <div className="flex items-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                      <ThumbsUp className="h-2.5 w-2.5" />
                    </div>
                    <span className="ml-1">{comment.likes}</span>
                  </div>
                )}
                {(comment.dislikes || 0) > 0 && (
                  <div className="flex items-center ml-1">
                    <div className="bg-muted text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center">
                      <ThumbsDown className="h-2.5 w-2.5" />
                    </div>
                    <span className="ml-1">{comment.dislikes}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="mt-2 pl-2">
              <form onSubmit={handleReplySubmit} className="flex items-start gap-2">
                <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                  <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userDisplayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {safeInitials(userDisplayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to ${comment.author_name || "Anonymous"}...`}
                    className="min-h-[60px] resize-none text-sm rounded-xl py-2 bg-muted/30"
                    disabled={isSubmitting}
                    autoFocus
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs mr-2"
                      onClick={() => setIsReplying(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className={cn("h-7 text-xs", isSubmitting && "opacity-70")}
                      disabled={isSubmitting || !replyContent.trim()}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* View replies button - only shown when there are replies and they're hidden */}
          {hasReplies && !showReplies && (
            <button
              className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors pl-2"
              onClick={toggleReplies}
            >
              <ChevronDown className="h-3 w-3" />
              <span>
                View {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </span>
            </button>
          )}

          {/* Replies */}
          {showReplies && hasReplies && (
            <div className="pl-4 mt-2 space-y-3 border-l-2 border-muted ml-2">
              {visibleReplies.map(
                (reply) =>
                  reply && (
                    <ReviewComment
                      key={`reply-${reply.id || "unknown"}`}
                      comment={reply}
                      serviceId={serviceId}
                      isOptimistic={Boolean(reply.isOptimistic)}
                    />
                  ),
              )}

              {/* Loading replies indicator */}
              {isLoadingReplies && (
                <div className="flex items-center gap-2 pl-2 py-1">
                  <Spinner size="sm" className="text-primary" />
                  <span className="text-xs text-muted-foreground">Loading replies...</span>
                </div>
              )}

              {/* Load more replies UI */}
              {hasMoreReplies && !isLoadingReplies && (
                <div className="pl-2">
                  {hasReachedMaxReplies ? (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={viewAllReplies}>
                      View all {replyCount} replies
                    </Button>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={loadMoreReplies}
                    >
                      <ChevronDown className="h-3 w-3" />
                      <span>
                        View {Math.min(remainingReplies, REPLIES_BATCH_SIZE)} more{" "}
                        {Math.min(remainingReplies, REPLIES_BATCH_SIZE) === 1 ? "reply" : "replies"}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Hide replies button */}
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pl-2"
                onClick={toggleReplies}
              >
                <ChevronUp className="h-3 w-3" />
                <span>Hide replies</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
