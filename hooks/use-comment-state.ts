"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { ReviewComment } from "@/types/reviews"

export function useCommentState(initialComments: ReviewComment[] = []) {
  const [comments, setComments] = useState<ReviewComment[]>(initialComments)
  const previousCommentsRef = useRef<ReviewComment[]>(initialComments)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update comments with smooth transition
  const updateComments = useCallback((newComments: ReviewComment[]) => {
    // Only update if comments have actually changed
    if (JSON.stringify(newComments) !== JSON.stringify(previousCommentsRef.current)) {
      previousCommentsRef.current = newComments
      setComments(newComments)
    }
  }, [])

  // Add a single comment with optimistic update
  const addComment = useCallback((newComment: ReviewComment) => {
    setComments((prevComments) => [...prevComments, newComment])
  }, [])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    comments,
    updateComments,
    addComment,
  }
}
