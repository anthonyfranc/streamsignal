"use client"

import type React from "react"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ThumbsUp, ThumbsDown, Reply, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ReviewComment as ReviewCommentType } from "@/types/reviews"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials, safeFormatDate, safeString, safeNumber } from "@/lib/data-safety-utils"

interface ReviewCommentProps {
  comment: ReviewCommentType
  serviceId: number
}

export function ReviewComment({ comment, serviceId }: ReviewCommentProps) {
  const { currentUser, submitReply, reactToComment } = useReviews()
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format date - with error handling
  const formatDate = (dateString: string | null | undefined) => {
    return safeFormatDate(dateString, (date) => formatDistanceToNow(date, { addSuffix: true }))
  }

  // Handle reply submission
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !currentUser) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("parentCommentId", String(safeNumber(comment?.id, 0)))
      formData.append("content", replyContent)
      formData.append("serviceId", String(safeNumber(serviceId, 0)))
      formData.append("nestingLevel", String(safeNumber(comment?.nesting_level, 1)))

      const result = await submitReply(formData)

      if (result.success) {
        setReplyContent("")
        setIsReplying(false)
      }
    } catch (error) {
      console.error("Error submitting reply:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle reaction
  const handleReaction = async (reactionType: "like" | "dislike") => {
    if (!currentUser) return
    await reactToComment(safeNumber(comment?.id, 0), reactionType)
  }

  // Safely access comment properties with fallbacks
  const authorName = safeString(comment?.author_name, "Anonymous")
  const authorAvatar = safeString(comment?.author_avatar, "/placeholder.svg")
  const content = safeString(comment?.content, "")
  const likes = safeNumber(comment?.likes, 0)
  const dislikes = safeNumber(comment?.dislikes, 0)
  const nestingLevel = safeNumber(comment?.nesting_level, 1)
  const createdAt = safeString(comment?.created_at, new Date().toISOString())
  const userReaction = comment?.user_reaction || null
  const replies = Array.isArray(comment?.replies) ? comment.replies : []

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Avatar className="h-7 w-7 border shadow-sm">
          <AvatarImage src={authorAvatar || "/placeholder.svg"} alt={authorName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">{safeInitials(authorName)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="bg-muted/50 rounded-2xl px-3 py-2">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-sm">{authorName}</h5>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-sm">{content}</p>
          </div>

          <div className="flex items-center gap-3 px-3">
            <button
              className={cn(
                "flex items-center gap-1 text-xs hover:text-primary transition-colors",
                userReaction === "like" ? "text-primary font-medium" : "text-muted-foreground",
              )}
              onClick={() => handleReaction("like")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {likes > 0 && <span>{likes}</span>}
            </button>

            <button
              className={cn(
                "flex items-center gap-1 text-xs hover:text-primary transition-colors",
                userReaction === "dislike" ? "text-primary font-medium" : "text-muted-foreground",
              )}
              onClick={() => handleReaction("dislike")}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {dislikes > 0 && <span>{dislikes}</span>}
            </button>

            {nestingLevel < 3 && (
              <button
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                onClick={() => setIsReplying(!isReplying)}
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
            )}

            <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
          </div>

          {isReplying && (
            <form onSubmit={handleReplySubmit} className="pt-2 pl-2 relative">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${authorName}...`}
                className="min-h-[60px] pr-10 resize-none text-sm rounded-xl py-2 bg-muted/30"
                disabled={isSubmitting}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsReplying(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-primary hover:bg-primary/90"
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? "Submitting..." : "Reply"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="pl-6 space-y-3 border-l-2 border-muted ml-3">
          {replies.map((reply) => (
            <ReviewComment key={safeNumber(reply?.id, 0)} comment={reply} serviceId={serviceId} />
          ))}
        </div>
      )}
    </div>
  )
}
