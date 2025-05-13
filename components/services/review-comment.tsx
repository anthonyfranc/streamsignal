"use client"

import type React from "react"

import { useState, useCallback, memo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, ThumbsDown, Reply, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReviewComment as ReviewCommentType } from "@/types/reviews"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials } from "@/lib/data-safety-utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ReviewCommentProps {
  comment: ReviewCommentType
  serviceId: number
  isOptimistic?: boolean
}

export const ReviewComment = memo(function ReviewComment({ comment, serviceId, isOptimistic }: ReviewCommentProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const { submitCommentReply, reactToComment, currentUser, userProfile, isSubmitting } = useReviews()

  // Calculate nesting level for indentation
  const nestingLevel = comment.nesting_level || 1
  const maxNestingLevel = 5 // Max visual nesting level

  // Process replies
  const replies = comment.replies || []
  const hasReplies = replies.length > 0
  const initialReplyCount = 2
  const visibleReplies = showAllReplies ? replies : replies.slice(0, initialReplyCount)
  const hasMoreReplies = replies.length > initialReplyCount

  // Format date
  const formattedDate = (() => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
    } catch (e) {
      return "unknown time ago"
    }
  })()

  // Handle reply submission
  const handleReplySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!replyContent.trim() || !currentUser) return

      try {
        const formData = new FormData()
        formData.append("reviewId", String(comment.review_id))
        formData.append("parentCommentId", String(comment.id))
        formData.append("content", replyContent)
        formData.append("serviceId", String(serviceId))

        // Reset the input field immediately for better UX
        setReplyContent("")

        // Close the reply form
        setIsReplying(false)

        await submitCommentReply(formData)
      } catch (error) {
        console.error("Error submitting reply:", error)
      }
    },
    [replyContent, comment, currentUser, serviceId, submitCommentReply],
  )

  // Handle comment reaction
  const handleReaction = useCallback(
    (reactionType: "like" | "dislike") => {
      if (!currentUser) return
      reactToComment(comment.id, reactionType)
    },
    [comment.id, currentUser, reactToComment],
  )

  // Toggle showing all replies
  const toggleShowAllReplies = useCallback(() => {
    setShowAllReplies((prev) => !prev)
  }, [])

  // Toggle comment expansion
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Get user display name and avatar
  const userDisplayName =
    userProfile?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    "Anonymous"
  const userAvatar = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "/placeholder.svg"

  // If comment is collapsed and has replies, show a compact view
  if (!isExpanded && hasReplies) {
    return (
      <div className="relative group py-2">
        <div className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={comment.author_avatar || "/placeholder.svg"} alt={comment.author_name} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {safeInitials(comment.author_name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{comment.author_name}</span>
            <span className="text-muted-foreground text-xs">{formattedDate}</span>
            <span className="text-muted-foreground text-xs">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleExpanded} className="h-7 w-7 p-0">
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">Expand</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative group",
        isOptimistic && "opacity-70",
        nestingLevel > 1 && "ml-2 sm:ml-6 md:ml-8 pl-2 sm:pl-3 border-l border-muted",
      )}
    >
      {/* Comment header with user info and actions */}
      <div className="flex items-start gap-2">
        <Avatar className={cn("flex-shrink-0 mt-0.5", nestingLevel <= maxNestingLevel ? "h-7 w-7" : "h-6 w-6")}>
          <AvatarImage src={comment.author_avatar || "/placeholder.svg"} alt={comment.author_name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {safeInitials(comment.author_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="bg-muted/40 px-3 py-2 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.author_name}</span>
                <span className="text-muted-foreground text-xs">{formattedDate}</span>
              </div>

              {/* Actions dropdown - removed collapse option */}
              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={() => setIsReplying(!isReplying)}>
                      {isReplying ? "Cancel reply" : "Reply"}
                    </DropdownMenuItem>
                    {/* We could add other options here like Report, etc. */}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Comment content */}
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          </div>

          {/* Comment actions */}
          <div className="flex items-center gap-2 pl-1 mt-1 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 gap-1 text-xs", comment.user_reaction === "like" && "text-primary")}
              onClick={() => handleReaction("like")}
              disabled={!currentUser}
            >
              <ThumbsUp className={cn("h-3.5 w-3.5", comment.user_reaction === "like" && "fill-current")} />
              <span>{comment.likes || 0}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 gap-1 text-xs", comment.user_reaction === "dislike" && "text-primary")}
              onClick={() => handleReaction("dislike")}
              disabled={!currentUser}
            >
              <ThumbsDown className={cn("h-3.5 w-3.5", comment.user_reaction === "dislike" && "fill-current")} />
              <span>{comment.dislikes || 0}</span>
            </Button>

            {currentUser && !isReplying && (
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => setIsReplying(true)}>
                <Reply className="h-3.5 w-3.5" />
                <span>Reply</span>
              </Button>
            )}

            {/* Collapse/expand button - only show for comments with replies */}
            {hasReplies && (
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs ml-auto" onClick={toggleExpanded}>
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span className="sr-only md:not-sr-only">Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span className="sr-only md:not-sr-only">Expand</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <form onSubmit={handleReplySubmit} className="mt-2 mb-4 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.author_name}...`}
                className="min-h-[60px] resize-none text-sm rounded-xl py-2 bg-muted/30"
                disabled={isSubmitting}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsReplying(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={cn("h-8 text-xs bg-primary hover:bg-primary/90", isSubmitting && "opacity-70")}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            </form>
          )}

          {/* Nested replies - only render if expanded */}
          {isExpanded && hasReplies && (
            <div className="space-y-3 mt-2">
              {visibleReplies.map((reply) => (
                <ReviewComment
                  key={`reply-${reply.id}`}
                  comment={reply}
                  serviceId={serviceId}
                  isOptimistic={reply.isOptimistic}
                />
              ))}

              {hasMoreReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-auto p-0 flex items-center gap-1"
                  onClick={toggleShowAllReplies}
                >
                  {showAllReplies ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>Show fewer replies</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      <span>
                        Show {replies.length - initialReplyCount} more{" "}
                        {replies.length - initialReplyCount === 1 ? "reply" : "replies"}
                      </span>
                    </>
                  )}
                </Button>
              )}

              {/* Show message when reaching max nesting */}
              {nestingLevel >= maxNestingLevel && currentUser && (
                <div className="text-xs text-muted-foreground italic mt-2">
                  Maximum reply depth reached. Please continue the conversation in a new comment.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
