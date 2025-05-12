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

interface ReviewCommentProps {
  comment: ReviewCommentType
  serviceId: number
}

export function ReviewComment({ comment, serviceId }: ReviewCommentProps) {
  const { currentUser, submitReply, reactToComment } = useReviews()
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format date
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Handle reply submission
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !currentUser) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("parentCommentId", comment.id.toString())
      formData.append("content", replyContent)
      formData.append("serviceId", serviceId.toString())
      formData.append("nestingLevel", comment.nesting_level.toString())

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
    await reactToComment(comment.id, reactionType)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Avatar className="h-7 w-7 border shadow-sm">
          <AvatarImage src={comment.author_avatar || "/placeholder.svg"} alt={comment.author_name} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(comment.author_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="bg-muted/50 rounded-2xl px-3 py-2">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-sm">{comment.author_name}</h5>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>

          <div className="flex items-center gap-3 px-3">
            <button
              className={cn(
                "flex items-center gap-1 text-xs hover:text-primary transition-colors",
                comment.user_reaction === "like" ? "text-primary font-medium" : "text-muted-foreground",
              )}
              onClick={() => handleReaction("like")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>

            <button
              className={cn(
                "flex items-center gap-1 text-xs hover:text-primary transition-colors",
                comment.user_reaction === "dislike" ? "text-primary font-medium" : "text-muted-foreground",
              )}
              onClick={() => handleReaction("dislike")}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {comment.dislikes > 0 && <span>{comment.dislikes}</span>}
            </button>

            {comment.nesting_level < 3 && (
              <button
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                onClick={() => setIsReplying(!isReplying)}
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
            )}

            <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
          </div>

          {isReplying && (
            <form onSubmit={handleReplySubmit} className="pt-2 pl-2 relative">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.author_name}...`}
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

      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-6 space-y-3 border-l-2 border-muted ml-3">
          {comment.replies.map((reply) => (
            <ReviewComment key={reply.id} comment={reply} serviceId={serviceId} />
          ))}
        </div>
      )}
    </div>
  )
}
