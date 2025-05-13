"use client"

import type React from "react"

import { useState, useCallback, memo } from "react"
import { formatDistanceToNow } from "date-fns"
import { ThumbsUp, MessageSquare, Edit2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useReviews } from "@/contexts/reviews-context"
import { cn } from "@/lib/utils"
import { safeInitials, safeFormatDate, safeString, safeNumber } from "@/lib/data-safety-utils"
import type { ReviewComment as ReviewCommentType } from "@/types/reviews"

interface ReviewCommentProps {
  comment: ReviewCommentType
  serviceId: number
  isOptimistic?: boolean
}

export const ReviewComment = memo(function ReviewComment({
  comment,
  serviceId,
  isOptimistic = false,
}: ReviewCommentProps) {
  const { currentUser, userProfile, submitReply, reactToComment, userReactions, isSubmitting, updateComment } =
    useReviews()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [localSubmitting, setLocalSubmitting] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Format date with error handling
  const formatDate = (dateString: string | null | undefined) => {
    return safeFormatDate(dateString, (date) => formatDistanceToNow(date, { addSuffix: true }))
  }

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!editContent.trim() || !currentUser) return

      setEditSubmitting(true)
      try {
        const formData = new FormData()
        formData.append("commentId", String(comment.id))
        formData.append("content", editContent)
        formData.append("serviceId", String(serviceId))

        const result = await updateComment(formData)

        if (result.success) {
          setIsEditing(false)
        } else {
          console.error("Error updating comment:", result.error)
        }
      } catch (error) {
        console.error("Error submitting edit:", error)
      } finally {
        setEditSubmitting(false)
      }
    },
    [comment, editContent, currentUser, serviceId, updateComment],
  )

  // Handle reply submission
  const handleReplySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!replyContent.trim() || !currentUser) return

      setLocalSubmitting(true)
      try {
        const formData = new FormData()
        formData.append("parentCommentId", String(comment.id))
        formData.append("content", replyContent)
        formData.append("nestingLevel", String(comment.nesting_level || 1))
        formData.append("reviewId", String(comment.review_id))
        formData.append("serviceId", String(serviceId))

        // Reset input field immediately for better UX
        setReplyContent("")

        const result = await submitReply(formData)

        if (result.success) {
          setShowReplyForm(false)
        }
      } catch (error) {
        console.error("Error submitting reply:", error)
      } finally {
        setLocalSubmitting(false)
      }
    },
    [comment, replyContent, currentUser, serviceId, submitReply],
  )

  // Handle comment reaction
  const handleCommentReaction = useCallback(
    async (commentId: number, reactionType: string) => {
      if (!currentUser) return
      await reactToComment(commentId, reactionType)
    },
    [currentUser, reactToComment],
  )

  // Get user reaction to this comment
  const getUserReactionToComment = (commentId: number) => {
    return userReactions[`comment_${commentId}`] || null
  }

  const isCommentAuthor = useCallback(() => {
    if (!currentUser) return false
    return currentUser.id === comment.user_id
  }, [currentUser, comment.user_id])

  const handleStartEdit = useCallback(() => {
    setEditContent(comment.content)
    setIsEditing(true)
    setShowReplyForm(false) // Close reply form if open
  }, [comment.content])

  // Get user display name and avatar
  const userDisplayName =
    userProfile?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    "Anonymous"
  const userAvatar = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "/placeholder.svg"

  // Safely access comment properties
  const commentId = safeNumber(comment?.id, 0)
  const authorName = safeString(comment?.author_name, "Anonymous")
  const authorAvatar = safeString(comment?.author_avatar, "/placeholder.svg")
  const content = safeString(comment?.content, "")
  const likes = safeNumber(comment?.likes, 0)
  const createdAt = safeString(comment?.created_at, new Date().toISOString())
  const updatedAt = comment?.updated_at || null
  const nestingLevel = safeNumber(comment?.nesting_level, 1)
  const replies = Array.isArray(comment?.replies) ? comment.replies : []

  return (
    <div className={cn("space-y-3", isOptimistic && "opacity-80")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 border shadow-sm flex-shrink-0">
          <AvatarImage src={authorAvatar || "/placeholder.svg"} alt={authorName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">{safeInitials(authorName)}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{authorName}</span>
            <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
            {updatedAt && <span className="text-xs text-muted-foreground italic">(edited)</span>}
          </div>

          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px] resize-none text-sm rounded-xl py-2 bg-muted/30"
                disabled={editSubmitting}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setIsEditing(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={cn("h-7 text-xs bg-primary hover:bg-primary/90", editSubmitting && "opacity-70")}
                  disabled={editSubmitting || !editContent.trim() || editContent === comment.content}
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm mt-1">{content}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                getUserReactionToComment(commentId) === "like"
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-primary",
              )}
              onClick={() => handleCommentReaction(commentId, "like")}
              disabled={isOptimistic}
            >
              <ThumbsUp
                className={cn("h-3.5 w-3.5", getUserReactionToComment(commentId) === "like" && "fill-primary")}
              />
              <span>Helpful{likes > 0 && ` (${likes})`}</span>
            </button>

            {nestingLevel < 3 && currentUser && (
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setShowReplyForm(!showReplyForm)}
                disabled={isOptimistic || isEditing}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>
            )}

            {isCommentAuthor() && !isEditing && (
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={handleStartEdit}
                disabled={isOptimistic}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {showReplyForm && currentUser && (
            <form onSubmit={handleReplySubmit} className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="h-5 w-5 border shadow-sm">
                  <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userDisplayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {safeInitials(userDisplayName)}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Replying as <span className="font-medium text-foreground">{userDisplayName}</span>
                </span>
              </div>

              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${authorName}...`}
                className="min-h-[60px] resize-none text-sm rounded-xl py-2 bg-muted/30"
                disabled={localSubmitting || isSubmitting}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowReplyForm(false)}
                  disabled={localSubmitting || isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={cn(
                    "h-7 text-xs bg-primary hover:bg-primary/90",
                    (localSubmitting || isSubmitting) && "opacity-70",
                  )}
                  disabled={localSubmitting || isSubmitting || !replyContent.trim()}
                >
                  {localSubmitting || isSubmitting ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="pl-8 space-y-3 border-l border-muted ml-4">
          {replies.map((reply) => (
            <ReviewComment
              key={`reply-${reply.id}`}
              comment={reply}
              serviceId={serviceId}
              isOptimistic={reply.isOptimistic}
            />
          ))}
        </div>
      )}
    </div>
  )
})
