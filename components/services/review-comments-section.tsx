"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReviewComment } from "./review-comment"
import { useReviews } from "@/contexts/reviews-context"
import { getUserDisplayName } from "@/lib/auth-utils"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

export function ReviewCommentsSection({ reviewId, serviceId }: ReviewCommentsSectionProps) {
  const { comments, currentUser, fetchComments, submitComment } = useReviews()
  const [commentContent, setCommentContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userDisplayName, setUserDisplayName] = useState<string>("Anonymous")
  const [hasFetchedComments, setHasFetchedComments] = useState(false)

  // Fetch comments for this review
  useEffect(() => {
    if (!hasFetchedComments) {
      fetchComments(reviewId).then(() => {
        setHasFetchedComments(true)
      })
    }
  }, [reviewId, fetchComments, hasFetchedComments])

  // Update user display name when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setUserDisplayName(getUserDisplayName(currentUser))
    }
  }, [currentUser])

  // Get comments for this review
  const reviewComments = comments[reviewId] || []

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser) {
      setError("You must be logged in to comment")
      return
    }

    if (!commentContent.trim()) {
      setError("Comment cannot be empty")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append("reviewId", reviewId.toString())
    formData.append("content", commentContent)
    formData.append("serviceId", serviceId.toString())

    const result = await submitComment(formData)

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    // Reset form
    setCommentContent("")
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

  return (
    <div className="space-y-6">
      {currentUser ? (
        <form onSubmit={handleCommentSubmit} className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={currentUser?.user_metadata?.avatar_url || "/placeholder.svg"} alt={userDisplayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(userDisplayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Write a comment..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              className="min-h-[80px] bg-background resize-none"
            />
            <div className="flex justify-between items-center">
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" size="sm" disabled={isSubmitting || !commentContent.trim()} className="ml-auto">
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to join the conversation</p>
      )}

      {hasFetchedComments && reviewComments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-4">
          {reviewComments.map((comment) => (
            <ReviewComment key={comment.id} comment={comment} serviceId={serviceId} nestingLevel={1} />
          ))}
        </div>
      )}
    </div>
  )
}
