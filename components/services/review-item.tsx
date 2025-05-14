"use client"

import { useState, memo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Star, MessageSquare, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useReviews } from "@/contexts/reviews-context"
import { cn } from "@/lib/utils"
import type { ServiceReview } from "@/types/reviews"
import { safeInitials } from "@/lib/data-safety-utils"
import { ReviewCommentsSection } from "./review-comments-section"

interface ReviewItemProps {
  review: ServiceReview
  serviceId: number
}

export const ReviewItem = memo(function ReviewItem({ review, serviceId }: ReviewItemProps) {
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const { currentUser, fetchComments, reactToReview, userReactions } = useReviews()

  const toggleComments = async () => {
    // If expanding comments, fetch them
    if (!commentsExpanded) {
      await fetchComments(review.id)
    }

    setCommentsExpanded(!commentsExpanded)
  }

  const handleReviewReaction = async (reactionType: "like" | "dislike") => {
    if (!currentUser) return
    await reactToReview(review.id, reactionType)
  }

  // Format date
  const formattedDate = (() => {
    try {
      return formatDistanceToNow(new Date(review.created_at), { addSuffix: true })
    } catch (e) {
      return "unknown time ago"
    }
  })()

  // Get user's reaction to this review
  const userReaction = userReactions[`review_${review.id}`]

  // Helper for rendering star ratings
  const renderStars = (rating?: number | null) => {
    if (!rating) return null
    return (
      <div className="flex items-center text-xs text-yellow-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn("h-3.5 w-3.5", i < rating ? "fill-yellow-500" : "fill-muted stroke-muted")} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 border-b border-muted pb-6">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 border shadow-sm">
          <AvatarImage src={review.author_avatar || "/placeholder.svg"} alt={review.author_name} />
          <AvatarFallback className="bg-primary/10 text-primary">{safeInitials(review.author_name)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between items-start">
            <div>
              <h5 className="font-medium">{review.author_name}</h5>
              <div className="flex items-center gap-2">
                <time className="text-xs text-muted-foreground">{formattedDate}</time>
                <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
              </div>
            </div>
          </div>

          <h4 className="text-base font-medium mt-1">{review.title}</h4>
          <p className="text-sm">{review.content}</p>

          {/* Additional ratings */}
          {(review.interface_rating || review.reliability_rating || review.content_rating || review.value_rating) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
              {review.interface_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Interface:</span>
                  {renderStars(review.interface_rating)}
                </div>
              )}
              {review.reliability_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reliability:</span>
                  {renderStars(review.reliability_rating)}
                </div>
              )}
              {review.content_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Content:</span>
                  {renderStars(review.content_rating)}
                </div>
              )}
              {review.value_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  {renderStars(review.value_rating)}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1 rounded-full px-3",
                userReaction === "like" && "bg-primary/10 text-primary hover:bg-primary/20",
              )}
              onClick={() => handleReviewReaction("like")}
              disabled={!currentUser}
            >
              <ThumbsUp className={cn("h-3.5 w-3.5", userReaction === "like" && "fill-primary")} />
              <span>{review.likes || ""}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 text-xs gap-1 rounded-full px-3",
                userReaction === "dislike" && "bg-primary/10 text-primary hover:bg-primary/20",
              )}
              onClick={() => handleReviewReaction("dislike")}
              disabled={!currentUser}
            >
              <ThumbsDown className={cn("h-3.5 w-3.5", userReaction === "dislike" && "fill-primary")} />
              <span>{review.dislikes || ""}</span>
            </Button>

            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={toggleComments}>
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Comments</span>
              {commentsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {commentsExpanded && (
        <div className="pl-10 pt-2 mt-2 border-t border-muted">
          <ReviewCommentsSection reviewId={review.id} serviceId={serviceId} />
        </div>
      )}
    </div>
  )
})
