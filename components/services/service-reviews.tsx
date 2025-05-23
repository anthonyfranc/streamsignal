"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Star, ThumbsUp, MessageSquare, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ReviewCommentsSection } from "./review-comments-section"
import { ReviewSkeleton } from "./review-skeleton"
import { AuthButton } from "@/components/auth/auth-button"
import { cn } from "@/lib/utils"
import { ReviewsProvider, useReviews } from "@/contexts/reviews-context"
import { safeInitials, safeFormatDate, safeString, safeNumber, safeGet } from "@/lib/data-safety-utils"
import { useAuth } from "@/contexts/auth-context"

interface ServiceReviewsProps {
  serviceId: number
}

// Export the ServiceReviews component directly
export function ServiceReviews({ serviceId }: ServiceReviewsProps) {
  return (
    <ReviewsProvider>
      <ServiceReviewsContent serviceId={serviceId} />
    </ReviewsProvider>
  )
}

function ServiceReviewsContent({ serviceId }: ServiceReviewsProps) {
  const {
    reviews,
    isInitialLoading,
    isSubmitting,
    currentUser,
    userProfile,
    fetchReviews,
    submitReview,
    reactToReview,
    userReactions,
  } = useReviews()

  // Also get auth state directly to ensure we have the latest
  const { user: authUser, isLoading: isAuthLoading } = useAuth()

  const [reviewFilter, setReviewFilter] = useState("all")
  const [userDisplayName, setUserDisplayName] = useState<string>("Anonymous")

  // Review form state
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [interfaceRating, setInterfaceRating] = useState(0)
  const [reliabilityRating, setReliabilityRating] = useState(0)
  const [contentRating, setContentRating] = useState(0)
  const [valueRating, setValueRating] = useState(0)
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({})
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({})
  const [showSkeleton, setShowSkeleton] = useState(true)

  // Track if we've already fetched reviews
  const [hasFetchedReviews, setHasFetchedReviews] = useState(false)

  // Track fetch attempts to prevent infinite loops
  const fetchAttemptsRef = useRef(0)

  // Track the last service ID we fetched for
  const lastServiceIdRef = useRef<number | null>(null)

  // Track auth state to refetch on changes
  const prevAuthStateRef = useRef<{ isAuthenticated: boolean; userId: string | null }>({
    isAuthenticated: false,
    userId: null,
  })

  // Use ref to track fetched reviews
  const fetchedReviewsRef = useRef<Record<number, boolean>>({})

  // Add a timeout to hide the skeleton after a maximum time
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false)
    }, 3000) // 3 seconds max loading time

    if (!isInitialLoading && !isAuthLoading) {
      setShowSkeleton(false)
      clearTimeout(timer)
    }

    return () => clearTimeout(timer)
  }, [isInitialLoading, isAuthLoading])

  // Check for auth state changes
  useEffect(() => {
    const isAuthenticated = !!(currentUser || authUser)
    const userId = (currentUser || authUser)?.id || null

    // If auth state changed, refetch reviews
    if (prevAuthStateRef.current.isAuthenticated !== isAuthenticated || prevAuthStateRef.current.userId !== userId) {
      console.log(
        `Auth state changed. Was: ${prevAuthStateRef.current.isAuthenticated}, Now: ${isAuthenticated}. Refetching reviews.`,
      )

      // Clear fetched flag
      fetchedReviewsRef.current = {}
      setHasFetchedReviews(false)

      // Reset fetch attempts counter
      fetchAttemptsRef.current = 0

      // Update previous auth state
      prevAuthStateRef.current = { isAuthenticated, userId }
    }
  }, [currentUser, authUser])

  // Fetch reviews when component mounts, serviceId changes, or auth state changes
  useEffect(() => {
    // Skip if we're still loading auth
    if (isAuthLoading) {
      console.log("Skipping fetch because auth is still loading")
      return
    }

    // Skip if we've already fetched for this service ID and auth state
    if (hasFetchedReviews && lastServiceIdRef.current === serviceId) {
      console.log(`Already fetched reviews for service ${serviceId}, skipping`)
      return
    }

    // Prevent excessive fetch attempts
    if (fetchAttemptsRef.current > 5) {
      console.warn(`Too many fetch attempts (${fetchAttemptsRef.current}), stopping to prevent infinite loop`)
      return
    }

    // Increment fetch attempts
    fetchAttemptsRef.current++

    console.log(`Fetching reviews for service ${serviceId} (attempt ${fetchAttemptsRef.current})`)

    // Set loading state
    setShowSkeleton(true)

    // Update last service ID
    lastServiceIdRef.current = serviceId

    // Fetch reviews
    fetchReviews(serviceId)
      .then(() => {
        console.log(`Completed fetch for service ${serviceId}`)
        setHasFetchedReviews(true)
        setShowSkeleton(false)
      })
      .catch((err) => {
        console.error(`Error fetching reviews for service ${serviceId}:`, err)
        setShowSkeleton(false)
      })
  }, [serviceId, fetchReviews, isAuthLoading, hasFetchedReviews])

  // Update user display name when currentUser changes
  useEffect(() => {
    // Use either the context user or the direct auth user
    const user = currentUser || authUser

    if (user) {
      try {
        // Safely extract display name
        const displayName =
          safeGet(userProfile, "display_name", null) ||
          safeGet(user, "user_metadata.full_name", null) ||
          safeGet(user, "user_metadata.name", null) ||
          (safeString(user.email) ? safeString(user.email).split("@")[0] : null) ||
          "Anonymous"

        setUserDisplayName(safeString(displayName, "Anonymous"))
      } catch (error) {
        console.error("Error setting user display name:", error)
        setUserDisplayName("Anonymous")
      }
    }
  }, [currentUser, userProfile, authUser])

  // Filter reviews based on selected filter
  const filteredReviews = useMemo(() => {
    // Ensure reviews is an array
    const reviewsArray = Array.isArray(reviews) ? reviews : []

    console.log(`Filtering ${reviewsArray.length} reviews with filter: ${reviewFilter}`)

    return reviewsArray.filter((review) => {
      if (!review || typeof review !== "object") return false

      const reviewRating = safeNumber(review.rating, 0)

      if (reviewFilter === "all") return true
      if (reviewFilter === "positive") return reviewRating >= 4
      if (reviewFilter === "neutral") return reviewRating === 3
      if (reviewFilter === "negative") return reviewRating <= 2
      return true
    })
  }, [reviews, reviewFilter])

  // Handle review submission
  const handleReviewSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Use either the context user or the direct auth user
      const user = currentUser || authUser

      if (!user) {
        setError("You must be logged in to submit a review")
        return
      }

      if (rating === 0) {
        setError("Please select a rating")
        return
      }

      if (!title.trim() || !content.trim()) {
        setError("Title and review content are required")
        return
      }

      setLocalSubmitting(true)
      setError(null)

      const formData = new FormData()
      formData.append("serviceId", serviceId.toString())
      formData.append("rating", rating.toString())
      formData.append("title", title)
      formData.append("content", content)

      if (interfaceRating > 0) formData.append("interfaceRating", interfaceRating.toString())
      if (reliabilityRating > 0) formData.append("reliabilityRating", reliabilityRating.toString())
      if (contentRating > 0) formData.append("contentRating", contentRating.toString())
      if (valueRating > 0) formData.append("valueRating", valueRating.toString())

      const result = await submitReview(formData)

      setLocalSubmitting(false)

      if (!result.success) {
        setError(result.error)
        return
      }

      // Reset form
      setRating(0)
      setTitle("")
      setContent("")
      setInterfaceRating(0)
      setReliabilityRating(0)
      setContentRating(0)
      setValueRating(0)
      setShowReviewForm(false)
    },
    [
      currentUser,
      authUser,
      rating,
      title,
      content,
      interfaceRating,
      reliabilityRating,
      contentRating,
      valueRating,
      serviceId,
      submitReview,
    ],
  )

  // Toggle review content expansion
  const toggleReviewExpansion = useCallback((reviewId: number) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }))
  }, [])

  // Toggle comments visibility
  const toggleComments = useCallback((reviewId: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }))
  }, [])

  // Handle review reaction
  const handleReviewReaction = useCallback(
    async (reviewId: number, reactionType: string) => {
      // Use either the context user or the direct auth user
      const user = currentUser || authUser

      if (!user) return
      await reactToReview(reviewId, reactionType)
    },
    [currentUser, authUser, reactToReview],
  )

  // Format date - with error handling
  const formatDate = (dateString: string | null | undefined) => {
    return safeFormatDate(dateString, (date) => formatDistanceToNow(date, { addSuffix: true }))
  }

  // Add this function to check if the user has reacted to a review
  const getUserReactionToReview = (reviewId: number) => {
    return userReactions[`review_${reviewId}`] || null
  }

  // Render skeleton loaders for initial loading
  const renderSkeletons = () => {
    return (
      <div className="space-y-5">
        <ReviewSkeleton />
        <ReviewSkeleton />
        <ReviewSkeleton />
      </div>
    )
  }

  // Determine if user is authenticated
  const isAuthenticated = !!currentUser || !!authUser

  // Check if we have reviews to display
  const hasReviews = Array.isArray(reviews) && reviews.length > 0

  // Debug output
  console.log(
    `ServiceReviews render: hasReviews=${hasReviews}, reviews.length=${Array.isArray(reviews) ? reviews.length : "not an array"}, isLoading=${isInitialLoading}, showSkeleton=${showSkeleton}`,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Tabs defaultValue="all" value={reviewFilter} onValueChange={setReviewFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="positive">Positive</TabsTrigger>
            <TabsTrigger value="neutral">Neutral</TabsTrigger>
            <TabsTrigger value="negative">Negative</TabsTrigger>
          </TabsList>
        </Tabs>

        {isAuthenticated && (
          <Button
            variant="outline"
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="bg-primary/5 hover:bg-primary/10 border-primary/20"
            disabled={localSubmitting || isSubmitting}
          >
            {showReviewForm ? "Cancel Review" : "Write a Review"}
          </Button>
        )}
      </div>

      {!isAuthenticated && (
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-center">Share Your Experience</CardTitle>
            <CardDescription className="text-center">
              Sign in to write reviews and join the conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <AuthButton />
          </CardContent>
        </Card>
      )}

      {isAuthenticated && showReviewForm && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle>Write a Review</CardTitle>
            <CardDescription>Share your experience with this streaming service</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Avatar className="h-6 w-6 border shadow-sm">
                  <AvatarImage
                    src={
                      safeGet(currentUser || authUser, "user_metadata.avatar_url", "/placeholder.svg") ||
                      "/placeholder.svg"
                    }
                    alt={userDisplayName}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {safeInitials(userDisplayName)}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Posting as <span className="font-medium text-foreground">{userDisplayName}</span>
                </span>
              </div>

              <div>
                <label htmlFor="rating" className="block text-sm font-medium mb-1">
                  Overall Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="text-muted hover:text-primary transition-colors"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      disabled={localSubmitting || isSubmitting}
                    >
                      <Star
                        className="h-7 w-7"
                        fill={(hoverRating || rating) >= star ? "currentColor" : "none"}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className="bg-muted/50"
                  required
                  disabled={localSubmitting || isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="review" className="block text-sm font-medium mb-1">
                  Review
                </label>
                <Textarea
                  id="review"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your experience with this streaming service"
                  className="min-h-[100px] bg-muted/50"
                  required
                  disabled={localSubmitting || isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="interface-rating" className="block text-sm font-medium mb-1">
                    Interface Rating
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="text-muted hover:text-primary transition-colors"
                        onClick={() => setInterfaceRating(star)}
                        disabled={localSubmitting || isSubmitting}
                      >
                        <Star
                          className="h-5 w-5"
                          fill={interfaceRating >= star ? "currentColor" : "none"}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="reliability-rating" className="block text-sm font-medium mb-1">
                    Reliability Rating
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="text-muted hover:text-primary transition-colors"
                        onClick={() => setReliabilityRating(star)}
                        disabled={localSubmitting || isSubmitting}
                      >
                        <Star
                          className="h-5 w-5"
                          fill={reliabilityRating >= star ? "currentColor" : "none"}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="content-rating" className="block text-sm font-medium mb-1">
                    Content Rating
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="text-muted hover:text-primary transition-colors"
                        onClick={() => setContentRating(star)}
                        disabled={localSubmitting || isSubmitting}
                      >
                        <Star
                          className="h-5 w-5"
                          fill={contentRating >= star ? "currentColor" : "none"}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="value-rating" className="block text-sm font-medium mb-1">
                    Value Rating
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="text-muted hover:text-primary transition-colors"
                        onClick={() => setValueRating(star)}
                        disabled={localSubmitting || isSubmitting}
                      >
                        <Star
                          className="h-5 w-5"
                          fill={valueRating >= star ? "currentColor" : "none"}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={localSubmitting || isSubmitting}
                  className={cn("bg-primary hover:bg-primary/90", (localSubmitting || isSubmitting) && "opacity-70")}
                >
                  {localSubmitting || isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {showSkeleton ? (
          renderSkeletons()
        ) : !hasReviews ? (
          <Card className="bg-muted/30 border-dashed">
            <CardHeader>
              <CardTitle className="text-center">No Reviews Yet</CardTitle>
              <CardDescription className="text-center">
                Be the first to share your experience with this streaming service
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-8">
              <MessageSquare className="h-16 w-16 text-muted" />
            </CardContent>
            <CardFooter className="flex justify-center">
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  onClick={() => setShowReviewForm(true)}
                  className="bg-primary/5 hover:bg-primary/10 border-primary/20"
                >
                  Write a Review
                </Button>
              ) : (
                <AuthButton />
              )}
            </CardFooter>
          </Card>
        ) : (
          filteredReviews.map((review) => {
            // Safely access review properties with fallbacks
            const reviewId = safeNumber(review?.id, 0)
            const authorName = safeString(review?.author_name, "Anonymous")
            const authorAvatar = safeString(review?.author_avatar, "/placeholder.svg")
            const reviewTitle = safeString(review?.title, "Review")
            const reviewContent = safeString(review?.content, "")
            const reviewRating = safeNumber(review?.rating, 0)
            const likes = safeNumber(review?.likes, 0)
            const createdAt = safeString(review?.created_at, new Date().toISOString())
            const interfaceRating = safeNumber(review?.interface_rating, 0)
            const reliabilityRating = safeNumber(review?.reliability_rating, 0)
            const contentRating = safeNumber(review?.content_rating, 0)
            const valueRating = safeNumber(review?.value_rating, 0)
            const isOptimistic = !!review?.isOptimistic

            return (
              <div
                key={reviewId}
                className={cn(
                  "group rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow",
                  isOptimistic && "opacity-80",
                )}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border shadow-sm">
                      <AvatarImage src={authorAvatar || "/placeholder.svg"} alt={authorName} />
                      <AvatarFallback className="bg-primary/10 text-primary">{safeInitials(authorName)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{authorName}</h4>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-4 w-4",
                                    star <= reviewRating ? "text-primary fill-primary" : "text-muted stroke-muted",
                                  )}
                                  strokeWidth={1.5}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>

                      <h5 className="font-medium mt-2 text-lg">{reviewTitle}</h5>

                      <div className="mt-1.5">
                        {reviewContent && reviewContent.length > 200 && !expandedReviews[reviewId] ? (
                          <>
                            <p className="text-sm leading-relaxed">{reviewContent.substring(0, 200)}...</p>
                            <button
                              className="text-sm text-primary hover:text-primary/80 font-medium mt-1"
                              onClick={() => toggleReviewExpansion(reviewId)}
                            >
                              See more
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm leading-relaxed">{reviewContent}</p>
                            {reviewContent && reviewContent.length > 200 && (
                              <button
                                className="text-sm text-primary hover:text-primary/80 font-medium mt-1"
                                onClick={() => toggleReviewExpansion(reviewId)}
                              >
                                See less
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Detailed ratings if available */}
                      {(interfaceRating > 0 || reliabilityRating > 0 || contentRating > 0 || valueRating > 0) && (
                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs p-3 bg-muted/30 rounded-lg">
                          {interfaceRating > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Interface:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      "h-3 w-3",
                                      star <= interfaceRating ? "text-primary fill-primary" : "text-muted stroke-muted",
                                    )}
                                    strokeWidth={1.5}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {reliabilityRating > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Reliability:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      "h-3 w-3",
                                      star <= reliabilityRating
                                        ? "text-primary fill-primary"
                                        : "text-muted stroke-muted",
                                    )}
                                    strokeWidth={1.5}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {contentRating > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Content:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      "h-3 w-3",
                                      star <= contentRating ? "text-primary fill-primary" : "text-muted stroke-muted",
                                    )}
                                    strokeWidth={1.5}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {valueRating > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Value:</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      "h-3 w-3",
                                      star <= valueRating ? "text-primary fill-primary" : "text-muted stroke-muted",
                                    )}
                                    strokeWidth={1.5}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-4">
                        <button
                          className={cn(
                            "flex items-center gap-1.5 text-sm transition-colors",
                            getUserReactionToReview(reviewId) === "like"
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:text-primary",
                          )}
                          onClick={() => handleReviewReaction(reviewId, "like")}
                          disabled={isOptimistic || !isAuthenticated}
                        >
                          <ThumbsUp
                            className={cn("h-4 w-4", getUserReactionToReview(reviewId) === "like" && "fill-primary")}
                          />
                          <span>{likes > 0 ? `${likes}` : ""}</span>
                        </button>
                        <button
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => toggleComments(reviewId)}
                          disabled={isOptimistic}
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Comment</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments section for this review */}
                <div
                  className={cn(
                    "border-t bg-muted/20 p-4 sm:p-5 transition-all duration-300",
                    expandedComments[reviewId] ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 hidden",
                  )}
                >
                  <ReviewCommentsSection reviewId={reviewId} serviceId={serviceId} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
