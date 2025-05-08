"use client"

import { useState, useTransition, useEffect, useCallback, useRef } from "react"
import { Star, ThumbsUp, ThumbsDown, MessageSquare, AlertCircle, Users, Lock, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  submitServiceReview,
  getServiceReviews,
  getUserReview,
  updateReviewLikes,
  type Review,
  checkAuthenticationStatus,
} from "@/app/actions/review-actions"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { ReviewsEmptyState } from "./reviews-empty-state"
import { ReviewReplies } from "./review-replies"
import { getReviewReplies } from "@/app/actions/reply-actions"
import type { ReviewReply } from "@/types/reviews"

interface ServiceReviewsProps {
  serviceId: number
  initialReviews?: Review[]
  initialCount?: number
  serviceName?: string
  initialReplies?: Record<number, ReviewReply[]>
}

export function ServiceReviews({
  serviceId,
  initialReviews = [],
  initialCount = 0,
  serviceName,
  initialReplies = {},
}: ServiceReviewsProps) {
  const { user, session, getSession, refreshSession, syncWithServer } = useAuth()
  const { toast } = useToast()
  const [reviewFilter, setReviewFilter] = useState("all")
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [reviewCount, setReviewCount] = useState(initialCount)
  const formRef = useRef<HTMLFormElement>(null)
  const [reviewReplies, setReviewReplies] = useState<Record<number, ReviewReply[]>>(initialReplies)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [authDiagnostics, setAuthDiagnostics] = useState<any>(null)

  // Use refs to maintain stable references
  const reviewRepliesRef = useRef<Record<number, ReviewReply[]>>(initialReplies)
  const mountedRef = useRef(true)
  const isFetchingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const filterRef = useRef(reviewFilter)
  const pendingInteractions = useRef(new Set<string>())

  // Track when the component has initialized
  const initializedRef = useRef(false)

  // Update refs when state changes
  useEffect(() => {
    reviewRepliesRef.current = reviewReplies
    filterRef.current = reviewFilter
  }, [reviewReplies, reviewFilter])

  // Cleanup on unmount
  useEffect(() => {
    // Set mounted flag for cleanup
    mountedRef.current = true

    return () => {
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      mountedRef.current = false
    }
  }, [])

  // Form state
  const [rating, setRating] = useState(0)
  const [interfaceRating, setInterfaceRating] = useState(0)
  const [reliabilityRating, setReliabilityRating] = useState(0)
  const [contentRating, setContentRating] = useState(0)
  const [valueRating, setValueRating] = useState(0)

  // Helper function to validate current authentication
  const ensureAuthentication = async () => {
    if (!user) return false

    try {
      // First check if we have a valid session locally
      if (!session) {
        console.log("No session in context, checking for session")
        const sessionResult = await getSession()
        if (!sessionResult.success) {
          console.warn("No valid session found")
          setAuthModalOpen(true)
          return false
        }
      }

      // Check authentication status from server
      const authStatus = await checkAuthenticationStatus()
      setAuthDiagnostics(authStatus)

      if (!authStatus.authenticated) {
        console.warn("Authentication validation failed, prompting login")

        // Try to sync with server first
        const syncResult = await syncWithServer()
        if (!syncResult.success) {
          setAuthModalOpen(true)
          return false
        }

        // Check again after sync
        const retryAuthStatus = await checkAuthenticationStatus()
        if (!retryAuthStatus.authenticated) {
          setAuthModalOpen(true)
          return false
        }
      }

      return true
    } catch (error) {
      console.error("Error validating authentication:", error)
      return false
    }
  }

  // Fetch reviews based on filter - this is a stable function that won't change
  const fetchReviews = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current || !mountedRef.current) {
      console.log("Skipping fetch - already fetching or component unmounted")
      return
    }

    try {
      isFetchingRef.current = true
      setIsLoading(true)

      console.log(`Fetching reviews for service ${serviceId} with filter ${filterRef.current}`)
      const data = await getServiceReviews(serviceId, filterRef.current)

      if (!mountedRef.current) return

      console.log(`Received ${data.length} reviews`)

      // Only update if the data has changed
      const currentReviewIds = reviews
        .map((r) => r.id)
        .sort()
        .join(",")
      const newReviewIds = data
        .map((r) => r.id)
        .sort()
        .join(",")

      if (currentReviewIds !== newReviewIds) {
        console.log("Reviews changed, updating state")
        setReviews(data)
      } else {
        console.log("Reviews unchanged, skipping update")
      }

      // Only fetch replies if we have reviews
      if (data.length > 0) {
        // Pre-fetch replies for all reviews to ensure they're available
        const repliesPromises = data.map((review) => getReviewReplies(review.id))
        const repliesResults = await Promise.all(repliesPromises)

        if (!mountedRef.current) return

        // Build a new replies object
        const newReplies: Record<number, ReviewReply[]> = {}
        data.forEach((review, index) => {
          newReplies[review.id] = repliesResults[index]
        })

        // Only update if there are actual changes - use JSON.stringify for deep comparison
        const currentRepliesJSON = JSON.stringify(reviewRepliesRef.current)
        const newRepliesJSON = JSON.stringify(newReplies)

        if (currentRepliesJSON !== newRepliesJSON) {
          console.log("Replies changed, updating state")
          setReviewReplies(newReplies)
        } else {
          console.log("Replies unchanged, skipping update")
        }
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load reviews. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
      // Set a delay before allowing another fetch
      timeoutRef.current = setTimeout(() => {
        isFetchingRef.current = false
      }, 5000) // 5 second cooldown between fetches
    }
  }, [serviceId, toast, reviews]) // Only depend on serviceId and toast

  // Fetch user's existing review if they're logged in
  const fetchUserReview = useCallback(async () => {
    if (!user || !mountedRef.current) {
      setUserReview(null)
      return
    }

    try {
      console.log(`Fetching user review for service ${serviceId} and user ${user.id}`)
      const review = await getUserReview(serviceId, user.id)

      if (!mountedRef.current) return

      setUserReview(review)

      // Pre-fill form if user has an existing review
      if (review) {
        console.log("Pre-filling form with existing review data")
        setRating(review.rating)
        setInterfaceRating(review.interface_rating)
        setReliabilityRating(review.reliability_rating)
        setContentRating(review.content_rating)
        setValueRating(review.value_rating)
      }
    } catch (error) {
      console.error("Error fetching user review:", error)
    }
  }, [serviceId, user])

  // Initial data load - only run once on mount and when filter changes
  useEffect(() => {
    // Only fetch if not already fetching and component is mounted
    if (!isFetchingRef.current && mountedRef.current) {
      console.log(`Filter changed to ${reviewFilter}, triggering fetch`)
      fetchReviews()
    }
  }, [reviewFilter, fetchReviews])

  // One-time initialization
  useEffect(() => {
    if (!initializedRef.current && mountedRef.current) {
      console.log("Component initialized, fetching initial data")
      initializedRef.current = true

      // If we have initial reviews, don't fetch again
      if (initialReviews.length === 0) {
        fetchReviews()
      }

      // Check for user review
      if (user) {
        fetchUserReview()
      }

      // Sync with server on initial load
      syncWithServer()
    }
  }, [fetchReviews, fetchUserReview, initialReviews.length, user, syncWithServer])

  // Check for user's existing review when they log in
  useEffect(() => {
    if (user && mountedRef.current) {
      fetchUserReview()
    }
  }, [user, fetchUserReview])

  // Clear form message when authentication state changes
  useEffect(() => {
    // Clear any auth-related messages when user logs in
    if (user && formMessage?.text.includes("logged in")) {
      setFormMessage(null)
    }
  }, [user, formMessage])

  // Handle form submission
  const handleSubmitReview = async (formData: FormData) => {
    // If user is not authenticated, show auth modal and stop form submission
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    // Validate form data before submission
    const title = formData.get("title") as string
    const content = formData.get("content") as string

    if (!title || title.trim().length < 3) {
      setFormMessage({
        type: "error",
        text: "Please provide a review title (minimum 3 characters).",
      })
      return
    }

    if (!content || content.trim().length < 10) {
      setFormMessage({
        type: "error",
        text: "Please provide review content (minimum 10 characters).",
      })
      return
    }

    if (rating < 1) {
      setFormMessage({
        type: "error",
        text: "Please provide an overall rating.",
      })
      return
    }

    // User is authenticated, proceed with form submission
    // Add ratings and user ID to form data
    formData.append("serviceId", serviceId.toString())
    formData.append("userId", user.id) // Add user ID to form data
    formData.append("rating", rating.toString())
    formData.append("interfaceRating", interfaceRating.toString())
    formData.append("reliabilityRating", reliabilityRating.toString())
    formData.append("contentRating", contentRating.toString())
    formData.append("valueRating", valueRating.toString())

    // Log form data for debugging
    console.log("Submitting review with ratings:", {
      rating,
      interfaceRating,
      reliabilityRating,
      contentRating,
      valueRating,
      userId: user.id,
    })

    startTransition(async () => {
      try {
        const result = await submitServiceReview(formData)

        if (!mountedRef.current) return

        if (result.success) {
          setFormMessage({ type: "success", text: result.message })

          // Update the user's review in state
          if (result.review) {
            setUserReview(result.review)
          }

          // Reset form
          if (!userReview) {
            setRating(0)
            setInterfaceRating(0)
            setReliabilityRating(0)
            setContentRating(0)
            setValueRating(0)

            // Reset form fields
            if (formRef.current) {
              formRef.current.reset()
            }
          }

          // Hide the form after successful submission
          setShowReviewForm(false)

          // Refresh reviews to show the latest data
          // Reset the fetching flag to allow a new fetch
          isFetchingRef.current = false
          fetchReviews()

          // Show success toast
          toast({
            title: "Success",
            description: result.message,
            variant: "default",
          })
        } else {
          // Only show auth modal if explicitly required and user is not authenticated
          if (result.requireAuth && !user) {
            setAuthModalOpen(true)
          } else {
            // Otherwise just show the error message
            setFormMessage({ type: "error", text: result.message })

            // Show error toast
            toast({
              title: "Error",
              description: result.message,
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error("Error submitting review:", error)

        if (mountedRef.current) {
          setFormMessage({
            type: "error",
            text: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          })

          toast({
            title: "Error",
            description: "Failed to submit review. Please try again.",
            variant: "destructive",
          })
        }
      }
    })
  }

  // Handle session refresh
  const handleSessionRefresh = async () => {
    if (isRefreshingSession) return

    setIsRefreshingSession(true)
    try {
      // First sync with server to ensure client and server are in agreement
      const syncResult = await syncWithServer()

      if (syncResult.success) {
        // Then check local session
        const sessionResult = await getSession()

        if (sessionResult.success) {
          // Check server-side authentication
          const authStatus = await checkAuthenticationStatus()
          setAuthDiagnostics(authStatus)

          if (authStatus.authenticated) {
            toast({
              title: "Session Active",
              description: "Your session is active and valid on both client and server.",
            })
          } else {
            // Server says not authenticated
            setAuthModalOpen(true)
            toast({
              title: "Server Authentication Failed",
              description: "Server could not verify your session. Please log in again.",
            })
          }
        } else {
          // If no session, show auth modal
          setAuthModalOpen(true)
          toast({
            title: "Session Expired",
            description: "Please log in again to continue.",
          })
        }
      } else {
        // Server sync failed
        setAuthModalOpen(true)
        toast({
          title: "Authentication Error",
          description: syncResult.error || "Server could not verify your session. Please log in again.",
        })
      }
    } catch (error) {
      console.error("Error checking session:", error)
      toast({
        title: "Error",
        description: "Failed to check your session status.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshingSession(false)
    }
  }

  // Handle like/dislike actions
  const handleReviewRating = async (reviewId: number, action: "like" | "dislike") => {
    // First, ensure the user is authenticated
    if (!user || !user.id) {
      console.log("Client: User not authenticated, showing auth modal")
      setAuthModalOpen(true)
      return
    }

    // Track which reviews have been interacted with to prevent double-clicking
    const interactionKey = `${reviewId}-${action}`
    if (pendingInteractions.current.has(interactionKey)) {
      console.log(`Ignoring duplicate ${action} request for review ${reviewId}`)
      return
    }

    // Mark this interaction as pending to prevent duplicates
    pendingInteractions.current.add(interactionKey)

    try {
      // Log the attempt with user details for debugging
      console.log(`Client: Attempting to ${action} review ${reviewId} by user ${user.id}`)

      // First check authentication status
      const authStatus = await checkAuthenticationStatus()
      console.log("Auth status check:", authStatus)
      setAuthDiagnostics(authStatus)

      if (!authStatus.authenticated) {
        console.error("Client: Authentication validation failed:", authStatus.error)

        // Try to refresh the session first
        await refreshSession()

        // Then sync with server
        const syncResult = await syncWithServer()

        if (!syncResult.success) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to continue.",
            variant: "destructive",
          })
          setAuthModalOpen(true)
          return
        }

        // Try auth check again after refresh and sync
        const retryAuthStatus = await checkAuthenticationStatus()
        if (!retryAuthStatus.authenticated) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to continue.",
            variant: "destructive",
          })
          setAuthModalOpen(true)
          return
        }
      }

      // Optimistically update UI
      setReviews((prevReviews) =>
        prevReviews.map((review) => {
          if (review.id === reviewId) {
            // Only update the appropriate counter
            if (action === "like") {
              return {
                ...review,
                likes: review.likes + 1,
              }
            } else {
              return {
                ...review,
                dislikes: review.dislikes + 1,
              }
            }
          }
          return review
        }),
      )

      // Send request to server with timeout for safety
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 10000))

      const result = (await Promise.race([updateReviewLikes(reviewId, action), timeoutPromise])) as {
        success: boolean
        message: string
        requireAuth?: boolean
        alreadyInteracted?: boolean
        currentInteraction?: string
        diagnostics?: any
      }

      if (!mountedRef.current) return

      // Update diagnostics if available
      if (result.diagnostics) {
        setAuthDiagnostics(result.diagnostics)
      }

      if (!result.success) {
        console.error(`Client: Failed to ${action} review:`, result.message)

        // If authentication is required, show auth modal
        if (result.requireAuth) {
          console.log("Server indicated auth is required, showing auth modal")
          setAuthModalOpen(true)
        } else {
          // Show error toast
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          })
        }

        // Reset the fetching flag to allow a new fetch to get the correct state
        isFetchingRef.current = false
        fetchReviews()
      } else if (result.alreadyInteracted) {
        // If the user already interacted but we didn't know it client-side,
        // refresh the data to get the correct state
        console.log(`Client: User already ${action}d review ${reviewId}, refreshing data`)
        isFetchingRef.current = false
        fetchReviews()
      } else {
        console.log(`Client: Successfully ${action}d review ${reviewId}`)

        // If we have information about the current interaction, update local state
        if (result.currentInteraction) {
          console.log(`Server confirmed interaction is now: ${result.currentInteraction}`)
        }

        // Show success toast
        toast({
          title: "Success",
          description: `Your ${action} has been recorded.`,
        })
      }
    } catch (error) {
      console.error(`Client: Exception in ${action} handler:`, error)

      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to record your rating. Please try again.",
          variant: "destructive",
        })

        // Reset the UI by refreshing the data
        isFetchingRef.current = false
        fetchReviews()
      }
    } finally {
      // Remove this interaction from pending set
      pendingInteractions.current.delete(interactionKey)
    }
  }

  // Star rating component
  const StarRating = ({
    value,
    onChange,
    label,
    disabled = false,
  }: {
    value: number
    onChange: (value: number) => void
    label: string
    disabled?: boolean
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onChange(star)}
            className={cn(
              "transition-all",
              disabled
                ? "cursor-not-allowed text-gray-300"
                : "text-gray-300 hover:text-black hover:scale-110 focus:outline-none",
            )}
            disabled={disabled}
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-all",
                star <= value ? "text-black fill-black" : "",
                !disabled && "hover:text-black",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )

  // Handle auth modal success
  const handleAuthSuccess = async () => {
    setAuthModalOpen(false)

    // Sync with server after successful authentication
    await syncWithServer()

    // Check authentication status
    const authStatus = await checkAuthenticationStatus()
    setAuthDiagnostics(authStatus)

    setShowReviewForm(true)
    // Show a message to the user that they can now submit their review
    setFormMessage({
      type: "success",
      text: "You're now logged in! Please fill out the review form below.",
    })
    // Fetch user review in case they already have one
    fetchUserReview()
  }

  // Toggle the review form visibility
  const toggleReviewForm = () => {
    if (!user) {
      setAuthModalOpen(true)
    } else {
      // Clear any previous form messages when toggling the form
      setFormMessage(null)
      setShowReviewForm(!showReviewForm)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Login prompt component for unauthenticated users
  const LoginPrompt = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="my-8"
    >
      <Card className="bg-gradient-to-r from-gray-50 to-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join our community of reviewers
          </CardTitle>
          <CardDescription>
            Share your experience with this streaming service and help others make informed decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="rounded-full bg-gray-100 p-3">
              <Lock className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Authentication Required</h3>
              <p className="text-sm text-gray-500 mt-1">Please sign in or create an account to submit your review</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => setAuthModalOpen(true)} className="w-full sm:w-auto">
            Sign in to write a review
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )

  // Handle new reply added
  const handleReplyAdded = (reviewId: number, reply: ReviewReply) => {
    console.log(`New reply added to review ${reviewId}:`, reply)

    // Update the reviewReplies state with the new reply
    setReviewReplies((prev) => {
      const currentReplies = [...(prev[reviewId] || [])]

      // Check if the reply already exists
      const existingIndex = currentReplies.findIndex((r) => r.id === reply.id)

      if (existingIndex >= 0) {
        // Replace existing reply
        currentReplies[existingIndex] = reply
      } else {
        // Add new reply
        currentReplies.push(reply)
      }

      return {
        ...prev,
        [reviewId]: currentReplies,
      }
    })
  }

  // Fetch replies for a review
  const fetchRepliesForReview = async (reviewId: number) => {
    try {
      console.log(`Fetching replies for review ${reviewId}`)
      const replies = await getReviewReplies(reviewId)

      if (!mountedRef.current) return []

      console.log(`Got ${replies.length} replies for review ${reviewId}`)

      // Only update if we got a valid response and it's different from current state
      if (Array.isArray(replies)) {
        const currentReplies = reviewRepliesRef.current[reviewId] || []

        // Check if the data is actually different
        if (
          JSON.stringify(replies.map((r) => r.id)) !== JSON.stringify(currentReplies.map((r) => r.id)) ||
          replies.length !== currentReplies.length
        ) {
          setReviewReplies((prev) => ({
            ...prev,
            [reviewId]: replies,
          }))
        }
      }

      return replies
    } catch (error) {
      console.error("Error fetching replies:", error)
      return []
    }
  }

  // Manual refresh button handler
  const handleManualRefresh = () => {
    if (!isFetchingRef.current) {
      console.log("Manual refresh triggered")
      isFetchingRef.current = false // Reset the flag
      fetchReviews()
    } else {
      toast({
        title: "Please wait",
        description: "Reviews are currently being refreshed",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Tabs defaultValue="all" value={reviewFilter} onValueChange={setReviewFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="positive">Positive</TabsTrigger>
            <TabsTrigger value="neutral">Neutral</TabsTrigger>
            <TabsTrigger value="negative">Negative</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleManualRefresh} disabled={isLoading}>
            <Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button variant="outline" onClick={toggleReviewForm}>
            {showReviewForm && user ? "Cancel Review" : userReview ? "Edit Your Review" : "Write a Review"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSessionRefresh} disabled={isRefreshingSession}>
            {isRefreshingSession ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Checking...
              </>
            ) : (
              "Check Session"
            )}
          </Button>
        </div>
      </div>

      {/* Auth diagnostics for debugging */}
      {authDiagnostics && (
        <Alert className="bg-gray-50 border-gray-200 mb-4">
          <AlertDescription>
            <details>
              <summary className="cursor-pointer text-sm font-medium">Auth Diagnostics</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-gray-100 rounded">
                {JSON.stringify(authDiagnostics, null, 2)}
              </pre>
            </details>
          </AlertDescription>
        </Alert>
      )}

      {/* Only show form messages that are relevant to the current user state */}
      {formMessage && !(formMessage.text.includes("logged in") && user) && (
        <Alert
          className={cn(
            "mb-4",
            formMessage.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200",
          )}
        >
          <AlertCircle className={cn("h-4 w-4", formMessage.type === "success" ? "text-green-600" : "text-red-600")} />
          <AlertDescription>{formMessage.text}</AlertDescription>
        </Alert>
      )}

      {/* Review Form for Authenticated Users */}
      <AnimatePresence>
        {user && showReviewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>{userReview ? "Edit Your Review" : "Share Your Experience"}</CardTitle>
                <CardDescription>Your review helps others make better streaming choices</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} id="reviewForm" className="space-y-6">
                  <input type="hidden" name="serviceId" value={serviceId} />
                  {/* Add hidden user ID field */}
                  <input type="hidden" name="userId" value={user.id} />

                  <div>
                    <Label htmlFor="title" className="text-sm font-medium">
                      Review Title
                    </Label>
                    <Input
                      type="text"
                      id="title"
                      name="title"
                      className="mt-1"
                      placeholder="Summarize your experience"
                      required
                      defaultValue={userReview?.title || ""}
                      minLength={3}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Ratings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <StarRating value={rating} onChange={setRating} label="Overall Rating *" />
                      <StarRating value={interfaceRating} onChange={setInterfaceRating} label="User Interface" />
                      <StarRating value={reliabilityRating} onChange={setReliabilityRating} label="Reliability" />
                      <StarRating value={contentRating} onChange={setContentRating} label="Content Quality" />
                      <StarRating value={valueRating} onChange={setValueRating} label="Value for Money" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="content" className="text-sm font-medium">
                      Your Review
                    </Label>
                    <Textarea
                      id="content"
                      name="content"
                      placeholder="Share details of your experience with this streaming service..."
                      className="mt-1 min-h-[120px]"
                      required
                      defaultValue={userReview?.content || ""}
                      minLength={10}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={isPending || rating < 1}
                      onClick={(e) => {
                        e.preventDefault()
                        if (formRef.current) {
                          const formData = new FormData(formRef.current)
                          handleSubmitReview(formData)
                        }
                      }}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {userReview ? "Updating..." : "Submitting..."}
                        </>
                      ) : (
                        <>{userReview ? "Update Review" : "Submit Review"}</>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">User Reviews</h3>
          {isLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading reviews...
            </div>
          )}
        </div>

        {/* Conditional rendering based on authentication and reviews */}
        {!isLoading && (
          <>
            {/* Priority 1: Show login prompt for unauthenticated users */}
            {!user && !showReviewForm && <LoginPrompt />}

            {/* Priority 2: Show reviews if they exist */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-start p-4 gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={`/abstract-geometric-shapes.png?height=40&width=40&query=${review.author_name}`}
                            alt={review.author_name}
                          />
                          <AvatarFallback>{review.author_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <h4 className="font-semibold">{review.author_name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= review.rating ? "text-black fill-black" : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <h5 className="font-medium mt-3">{review.title}</h5>
                          <p className="text-sm mt-2 text-gray-700">{review.content}</p>
                          <div className="flex items-center gap-4 mt-4">
                            <button
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                              onClick={() => handleReviewRating(review.id, "like")}
                              disabled={!user}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span>{review.likes}</span>
                            </button>
                            <button
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                              onClick={() => handleReviewRating(review.id, "dislike")}
                              disabled={!user}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              <span>{review.dislikes}</span>
                            </button>
                            <button
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                              onClick={() => fetchRepliesForReview(review.id)}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>
                                {reviewReplies[review.id]?.length || 0}{" "}
                                {reviewReplies[review.id]?.length === 1 ? "reply" : "replies"}
                              </span>
                            </button>
                          </div>

                          {/* Review Replies Component */}
                          <ReviewReplies
                            reviewId={review.id}
                            initialReplies={reviewReplies[review.id] || []}
                            onAuthRequired={() => setAuthModalOpen(true)}
                            onReplyAdded={handleReplyAdded}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : /* Priority 3: Show empty state for authenticated users with no reviews */
            user && reviewFilter === "all" ? (
              <ReviewsEmptyState onWriteReview={toggleReviewForm} serviceName={serviceName} />
            ) : (
              /* Priority 4: Show filter message if no reviews match filter */
              reviewFilter !== "all" && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No reviews found with the selected filter.</p>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        defaultTab="login"
        title="Sign in to write a review"
        description="Join our community to share your streaming experience and help others make informed decisions."
      />
    </div>
  )
}
