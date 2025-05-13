"use client"

import { useState, useCallback, useRef } from "react"
import type { ServiceReview, ReviewComment } from "@/types/reviews"

/**
 * Custom hook to manage reviews data
 */
export function useReviewsData() {
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [comments, setComments] = useState<Record<number, ReviewComment[]>>({})
  const [userReactions, setUserReactions] = useState<Record<string, string>>({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({})

  // Use refs to track if we've already fetched data
  const fetchedReviewsRef = useRef<Record<number, boolean>>({})
  const fetchedCommentsRef = useRef<Record<number, boolean>>({})

  // Reset fetched state
  const resetFetchedState = useCallback(() => {
    fetchedReviewsRef.current = {}
    fetchedCommentsRef.current = {}
  }, [])

  return {
    // State
    reviews,
    setReviews,
    comments,
    setComments,
    userReactions,
    setUserReactions,
    isInitialLoading,
    setIsInitialLoading,
    isSubmitting,
    setIsSubmitting,
    commentsLoading,
    setCommentsLoading,

    // Refs
    fetchedReviewsRef,
    fetchedCommentsRef,

    // Actions
    resetFetchedState,
  }
}
