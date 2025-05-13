"use client"

import { memo, useState } from "react"
import { CommentItem } from "./comment-item"
import { ReviewCommentSkeleton } from "./review-comment-skeleton"
import type { ReviewComment } from "@/types/reviews"
import { safeNumber } from "@/lib/data-safety-utils"

interface CommentThreadProps {
  comment: ReviewComment
  serviceId: number
  onReplyAdded?: (parentId: number, reply: ReviewComment) => void
}

function CommentThreadComponent({ comment, serviceId, onReplyAdded }: CommentThreadProps) {
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const [replies, setReplies] = useState<ReviewComment[]>(Array.isArray(comment.replies) ? comment.replies : [])

  // Handle when a reply is submitted to this comment
  const handleReplySubmitted = (parentId: number, reply: ReviewComment) => {
    // Show loading state briefly for a smoother transition
    setIsLoadingReplies(true)

    // Add the reply to our local state
    setTimeout(() => {
      setReplies((prev) => [...prev, reply])
      setIsLoadingReplies(false)

      // Notify parent if needed
      if (onReplyAdded) {
        onReplyAdded(parentId, reply)
      }
    }, 300)
  }

  return (
    <div className="space-y-3">
      <CommentItem comment={comment} serviceId={serviceId} onReplySubmitted={handleReplySubmitted} />

      {(replies.length > 0 || isLoadingReplies) && (
        <div className="pl-6 space-y-3 border-l-2 border-muted ml-3">
          {isLoadingReplies ? (
            <ReviewCommentSkeleton />
          ) : (
            replies.map((reply) => (
              <CommentThread
                key={safeNumber(reply?.id, 0)}
                comment={reply}
                serviceId={serviceId}
                onReplyAdded={onReplyAdded}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Use React.memo to prevent unnecessary re-renders
export const CommentThread = memo(CommentThreadComponent, (prevProps, nextProps) => {
  // Only re-render if these properties change
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.content === nextProps.comment.content &&
    prevProps.comment.likes === nextProps.comment.likes &&
    prevProps.comment.dislikes === nextProps.comment.dislikes &&
    prevProps.comment.user_reaction === nextProps.comment.user_reaction &&
    JSON.stringify(prevProps.comment.replies) === JSON.stringify(nextProps.comment.replies)
  )
})
