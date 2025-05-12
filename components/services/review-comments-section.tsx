"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ReviewComment } from "./review-comment"
import { AuthButton } from "@/components/auth/auth-button"
import { useReviews } from "@/contexts/reviews-context"

interface ReviewCommentsSectionProps {
  reviewId: number
  serviceId: number
}

export function ReviewCommentsSection({ reviewId, serviceId }: ReviewCommentsSectionProps) {
  const { currentUser, comments, fetchComments, submitComment } = useReviews()
  const [isLoading, setIsLoading] = useState(true)
  const [commentContent, setCommentContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)

  useEffect(() => {
    const loadComments = async () => {
      setIsLoading(true)
      try {
        await fetchComments(reviewId)
      } catch (error) {
        console.error("Error loading comments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [reviewId, fetchComments])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentContent.trim() || !currentUser) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("reviewId", reviewId.toString())
      formData.append("content", commentContent)
      formData.append("serviceId", serviceId.toString())

      const result = await submitComment(formData)

      if (result.success) {
        setCommentContent("")
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setIsSubmitting(false)
    }
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

  const reviewComments = comments[reviewId] || []

  // Display only the first 3 comments unless showAllComments is true
  const displayedComments = showAllComments ? reviewComments : reviewComments.slice(0, 3)
  const hasMoreComments = reviewComments.length > 3 && !showAllComments

  return (
    <div className="space-y-4">
      {reviewComments.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {reviewComments.length} {reviewComments.length === 1 ? "comment" : "comments"}
          </span>
          <Separator className="w-4" />
          <button className="text-primary hover:underline text-xs font-medium">Most relevant</button>
        </div>
      )}

      {currentUser ? (
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 border shadow-sm">
            <AvatarImage
              src={currentUser.user_metadata?.avatar_url || "/placeholder.svg"}
              alt={currentUser.user_metadata?.full_name || "You"}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(currentUser.user_metadata?.full_name || "You")}
            </AvatarFallback>
          </Avatar>
          <form onSubmit={handleCommentSubmit} className="flex-1 relative">
            <Textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[60px] pr-10 resize-none text-sm rounded-2xl py-2.5 bg-muted/50"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-primary hover:bg-primary/90"
              disabled={isSubmitting || !commentContent.trim()}
            >
              <Send className="h-3.5 w-3.5 text-primary-foreground" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl">
          <p className="text-sm text-muted-foreground">Sign in to leave a comment</p>
          <AuthButton />
        </div>
      )}

      <div className="space-y-4 pt-2">
        {isLoading ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          </div>
        ) : reviewComments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <>
            {displayedComments.map((comment) => (
              <ReviewComment key={comment.id} comment={comment} serviceId={serviceId} />
            ))}

            {hasMoreComments && (
              <button
                className="text-sm text-primary font-medium hover:underline"
                onClick={() => setShowAllComments(true)}
              >
                View all {reviewComments.length} comments
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
