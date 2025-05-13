"use client"

import type React from "react"
import { memo, useState, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useReviews } from "@/contexts/reviews-context"
import { safeInitials } from "@/lib/data-safety-utils"
import type { ReviewComment } from "@/types/reviews"

interface CommentFormProps {
  reviewId: number
  serviceId: number
  onCommentSubmitted?: (comment: ReviewComment) => void
}

function CommentFormComponent({ reviewId, serviceId, onCommentSubmitted }: CommentFormProps) {
  const { currentUser, userProfile, submitComment } = useReviews()
  const [commentContent, setCommentContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get user display name and avatar
  const userDisplayName =
    userProfile?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    "Anonymous"

  const userAvatar = userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || "/placeholder.svg"

  // Handle comment submission
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!commentContent.trim() || !currentUser) return

      setIsSubmitting(true)
      try {
        const formData = new FormData()
        formData.append("reviewId", String(reviewId))
        formData.append("content", commentContent)
        formData.append("serviceId", String(serviceId))

        const result = await submitComment(formData)

        if (result.success) {
          // Clear the form
          setCommentContent("")

          // Notify parent if the callback exists and we have data
          if (result.data && onCommentSubmitted) {
            onCommentSubmitted(result.data)
          }
        }
      } catch (error) {
        console.error("Error submitting comment:", error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [commentContent, currentUser, reviewId, serviceId, submitComment, onCommentSubmitted],
  )

  if (!currentUser) {
    return null
  }

  return (
    <form onSubmit={handleCommentSubmit} className="flex gap-3">
      <Avatar className="h-8 w-8 border shadow-sm flex-shrink-0">
        <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userDisplayName} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">{safeInitials(userDisplayName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <Textarea
          value={commentContent}
          onChange={(e) => setCommentContent(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[60px] resize-none text-sm rounded-xl py-2 bg-muted/30"
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90"
            disabled={isSubmitting || !commentContent.trim()}
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </form>
  )
}

// Memoize the component
export const CommentForm = memo(CommentFormComponent)
