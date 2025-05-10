"use client"

import type React from "react"

import { useState, useEffect, useTransition, useCallback, useRef } from "react"
import { Star, AlertCircle, Users, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { submitServiceReview } from "@/app/actions/review-actions"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ReviewItem } from "./review-item"
import { supabase } from "@/lib/supabase"
import type { Review, Reply } from "@/types/reviews"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"

// Add an isVisible prop to the component to track when it's actually visible
// This will allow us to control when subscriptions are active

// Update the component signature to accept the isVisible prop
export function ServiceReviews({ serviceId, isVisible = true }: { serviceId: number; isVisible?: boolean }) {
  const { user } = useAuth()
  const [reviewFilter, setReviewFilter] = useState("all")
  const [isPending, startTransition] = useTransition()
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [replies, setReplies] = useState<Record<number, Reply[]>>({})
  const [loading, setLoading] = useState(true)
  const [newReviewId, setNewReviewId] = useState<number | null>(null)
  const newReviewRef = useRef<HTMLDivElement>(null)

  // Form state
  const [rating, setRating] = useState(0)
  const [interfaceRating, setInterfaceRating] = useState(0)
  const [reliabilityRating, setReliabilityRating] = useState(0)
  const [contentRating, setContentRating] = useState(0)
  const [valueRating, setValueRating] = useState(0)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewContent, setReviewContent] = useState("")

  // Set up real-time subscription for reviews
  useSupabaseRealtime<Review>(
    "service_reviews",
    "*",
    { column: "service_id", value: serviceId },
    async (payload) => {
      if (payload.new && payload.new.status === "approved") {
        // For new reviews, fetch the user profile
        if (payload.eventType === "INSERT") {
          const review = payload.new

          // Check if this is our own review that we've already added optimistically
          const existingReview = reviews.find((r) => r.id === review.id)
          if (existingReview) {
            console.log("Ignoring realtime update for already displayed review:", review.id)
            return
          }

          const reviewWithProfile = { ...review, user_profile: { avatar_url: null } }

          try {
            if (review.user_id) {
              const { data: profileData, error } = await supabase
                .from("user_profiles")
                .select("avatar_url")
                .eq("id", review.user_id)
                .single()

              if (profileData && !error) {
                reviewWithProfile.user_profile = profileData
              }
            }
          } catch (error) {
            console.error("Error fetching user profile:", error)
          }

          // Mark this as the newest review for animation
          setNewReviewId(review.id)

          // Add the new review to the state
          setReviews((prev) => [reviewWithProfile, ...prev])

          // Initialize empty replies for this review
          setReplies((prev) => ({ ...prev, [review.id]: [] }))

          // Clear the new review ID after animation
          setTimeout(() => {
            setNewReviewId(null)
          }, 3000)
        }
        // For updated reviews, update the local state
        else if (payload.eventType === "UPDATE") {
          setReviews((prev) =>
            prev.map((review) =>
              review.id === payload.new.id ? { ...review, ...payload.new, user_profile: review.user_profile } : review,
            ),
          )
        }
        // For deleted reviews, remove from local state
        else if (payload.eventType === "DELETE" && payload.old) {
          setReviews((prev) => prev.filter((review) => review.id !== payload.old.id))

          // Also remove any replies for this review
          setReplies((prev) => {
            const newReplies = { ...prev }
            delete newReplies[payload.old.id]
            return newReplies
          })
        }
      }
    },
    isVisible, // Pass the isVisible prop
  )

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch approved reviews for this service
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("service_reviews")
        .select(`*`)
        .eq("service_id", serviceId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError)
        return
      }

      // For each review, fetch the user profile separately
      const reviewsWithProfiles = await Promise.all(
        reviewsData.map(async (review) => {
          if (review.user_id) {
            const { data: profileData } = await supabase
              .from("user_profiles")
              .select("avatar_url")
              .eq("id", review.user_id)
              .single()

            return {
              ...review,
              user_profile: profileData || { avatar_url: null },
            }
          }
          return {
            ...review,
            user_profile: { avatar_url: null },
          }
        }),
      )

      setReviews(reviewsWithProfiles as Review[])

      // Fetch replies for each review with a delay between requests to avoid rate limiting
      const repliesMap: Record<number, Reply[]> = {}

      // Process reviews in batches to avoid rate limiting
      const batchSize = 2
      for (let i = 0; i < reviewsData.length; i += batchSize) {
        const batch = reviewsData.slice(i, i + batchSize)

        // Process each review in the batch in parallel
        await Promise.all(
          batch.map(async (review) => {
            try {
              // Fetch all replies for this review
              const { data: repliesData, error: repliesError } = await supabase
                .from("review_replies")
                .select(`*`)
                .eq("review_id", review.id)
                .eq("status", "approved")
                .order("created_at", { ascending: true })

              if (repliesError) {
                // Check for rate limiting errors specifically
                if (repliesError.message && repliesError.message.includes("Too Many")) {
                  console.warn(`Rate limited when fetching replies for review ${review.id}, will set empty replies`)
                  repliesMap[review.id] = []
                  return
                }

                console.error(`Error fetching replies for review ${review.id}:`, repliesError)
                repliesMap[review.id] = []
                return
              }

              if (repliesData && repliesData.length > 0) {
                // For each reply, fetch the user profile separately
                const repliesWithProfiles = await Promise.all(
                  repliesData.map(async (reply) => {
                    if (reply.user_id) {
                      const { data: profileData } = await supabase
                        .from("user_profiles")
                        .select("avatar_url")
                        .eq("id", reply.user_id)
                        .single()

                      return {
                        ...reply,
                        user_profile: profileData || { avatar_url: null },
                      }
                    }
                    return {
                      ...reply,
                      user_profile: { avatar_url: null },
                    }
                  }),
                )

                // Organize replies into a threaded structure
                const threadedReplies: Reply[] = []
                const replyMap: Record<number, Reply> = {}

                // First pass: create a map of all replies
                repliesWithProfiles.forEach((reply) => {
                  replyMap[reply.id] = { ...reply, replies: [] }
                })

                // Second pass: organize into parent-child relationships
                repliesWithProfiles.forEach((reply) => {
                  if (reply.parent_id === null) {
                    // This is a top-level reply
                    threadedReplies.push(replyMap[reply.id])
                  } else {
                    // This is a child reply
                    if (replyMap[reply.parent_id]) {
                      if (!replyMap[reply.parent_id].replies) {
                        replyMap[reply.parent_id].replies = []
                      }
                      replyMap[reply.parent_id].replies!.push(replyMap[reply.id])
                    } else {
                      // If parent doesn't exist (shouldn't happen), add as top-level
                      threadedReplies.push(replyMap[reply.id])
                    }
                  }
                })

                repliesMap[review.id] = threadedReplies
              } else {
                repliesMap[review.id] = []
              }
            } catch (error) {
              console.error(`Error processing replies for review ${review.id}:`, error)
              repliesMap[review.id] = []
            }
          }),
        )

        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < reviewsData.length) {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      }

      setReplies(repliesMap)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [serviceId])

  useEffect(() => {
    // Only fetch data when the component is visible
    if (isVisible) {
      fetchInitialData()
    }
  }, [fetchInitialData, isVisible])

  // Filter reviews based on selected filter
  const filteredReviews = reviews.filter((review) => {
    if (reviewFilter === "all") return true
    if (reviewFilter === "positive") return review.rating >= 4
    if (reviewFilter === "neutral") return review.rating === 3
    if (reviewFilter === "negative") return review.rating <= 2
    return true
  })

  // Handle form submission
  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault()

    // If user is not authenticated, show auth modal
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    if (!reviewTitle.trim()) {
      setFormMessage({ type: "error", text: "Please provide a review title" })
      return
    }

    if (!reviewContent.trim()) {
      setFormMessage({ type: "error", text: "Please provide review content" })
      return
    }

    if (rating === 0) {
      setFormMessage({ type: "error", text: "Please provide an overall rating" })
      return
    }

    startTransition(async () => {
      try {
        // Add form data
        const formData = new FormData()
        formData.append("serviceId", serviceId.toString())
        formData.append("title", reviewTitle)
        formData.append("content", reviewContent)
        formData.append("rating", rating.toString())
        formData.append("interfaceRating", (interfaceRating || rating).toString())
        formData.append("reliabilityRating", (reliabilityRating || rating).toString())
        formData.append("contentRating", (contentRating || rating).toString())
        formData.append("valueRating", (valueRating || rating).toString())

        // Submit to server
        const result = await submitServiceReview(formData)

        if (result.success) {
          // If we have a reviewId, manually add the review to the UI
          if (result.reviewId) {
            // Create a new review object
            const newReview: Review = {
              id: result.reviewId,
              service_id: serviceId,
              user_id: user.id,
              author_name:
                user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
              rating: rating,
              title: reviewTitle,
              content: reviewContent,
              interface_rating: interfaceRating || rating,
              reliability_rating: reliabilityRating || rating,
              content_rating: contentRating || rating,
              value_rating: valueRating || rating,
              likes: 0,
              dislikes: 0,
              created_at: new Date().toISOString(),
              status: "approved",
              user_profile: {
                avatar_url: user.user_metadata?.avatar_url || null,
              },
            }

            // Add the new review to the state
            setReviews((prev) => [newReview, ...prev])

            // Initialize empty replies for this review
            setReplies((prev) => ({ ...prev, [newReview.id]: [] }))

            // Mark this as the newest review for animation
            setNewReviewId(newReview.id)

            // Clear the new review ID after animation
            setTimeout(() => {
              setNewReviewId(null)
            }, 3000)
          }

          // Reset form
          setRating(0)
          setInterfaceRating(0)
          setReliabilityRating(0)
          setContentRating(0)
          setValueRating(0)
          setReviewTitle("")
          setReviewContent("")

          // Hide the form after successful submission
          setShowReviewForm(false)

          // Show success message
          setFormMessage({
            type: "success",
            text: "Your review has been submitted successfully!",
          })

          // Clear success message after 3 seconds
          setTimeout(() => {
            setFormMessage(null)
          }, 3000)
        } else {
          setFormMessage({ type: "error", text: result.message })
          if (result.requireAuth) {
            setAuthModalOpen(true)
          }
        }
      } catch (error) {
        console.error("Error submitting review:", error)
        setFormMessage({ type: "error", text: "An error occurred while submitting your review. Please try again." })
      }
    })
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
  const handleAuthSuccess = () => {
    setAuthModalOpen(false)
    setShowReviewForm(true)
    // Show a message to the user that they can now submit their review
    setFormMessage({
      type: "success",
      text: "You're now logged in! Please fill out the review form below.",
    })
  }

  // Toggle the review form visibility
  const toggleReviewForm = () => {
    if (!user) {
      setAuthModalOpen(true)
    } else {
      setShowReviewForm(!showReviewForm)
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
        <Button variant="outline" onClick={toggleReviewForm}>
          {showReviewForm && user ? "Cancel Review" : "Write a Review"}
        </Button>
      </div>

      <AnimatePresence>
        {formMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Alert
              className={cn(
                "mb-4",
                formMessage.type === "success"
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-800 border-red-200",
              )}
            >
              <AlertCircle
                className={cn("h-4 w-4", formMessage.type === "success" ? "text-green-600" : "text-red-600")}
              />
              <AlertDescription>{formMessage.text}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call-to-Action Card for Unauthenticated Users */}
      <AnimatePresence>
        {!user && !showReviewForm && (
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
                    <p className="text-sm text-gray-500 mt-1">
                      Please sign in or create an account to submit your review
                    </p>
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
        )}
      </AnimatePresence>

      {/* Facebook-style Review Form for Authenticated Users */}
      <AnimatePresence>
        {user && showReviewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="border-gray-200" id="reviewForm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Share Your Experience</CardTitle>
                <CardDescription>Your review helps others make better streaming choices</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitReview} className="space-y-6" action="javascript:void(0);">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage
                        src={user?.user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40&query=avatar"}
                        alt={user?.user_metadata?.full_name || "User"}
                      />
                      <AvatarFallback>
                        {(user?.user_metadata?.full_name || user?.email || "U").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                      <div>
                        <Input
                          type="text"
                          placeholder="Review Title"
                          className="font-medium"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Textarea
                          placeholder={`What did you think about this streaming service, ${
                            user?.user_metadata?.full_name?.split(" ")[0] || "there"
                          }?`}
                          className="min-h-[120px]"
                          value={reviewContent}
                          onChange={(e) => setReviewContent(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Ratings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <StarRating value={rating} onChange={setRating} label="Overall Rating" />
                      <StarRating value={interfaceRating} onChange={setInterfaceRating} label="User Interface" />
                      <StarRating value={reliabilityRating} onChange={setReliabilityRating} label="Reliability" />
                      <StarRating value={contentRating} onChange={setRating} label="Content Quality" />
                      <StarRating value={valueRating} onChange={setValueRating} label="Value for Money" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending || !reviewTitle.trim() || !reviewContent.trim() || rating === 0}
                    >
                      {isPending ? "Submitting..." : "Post Review"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Review Form for Authenticated Users */}
      {user && !showReviewForm && (
        <div className="my-4">
          <div
            className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={toggleReviewForm}
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage
                src={user?.user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40&query=avatar"}
                alt={user?.user_metadata?.full_name || "User"}
              />
              <AvatarFallback>
                {(user?.user_metadata?.full_name || user?.email || "U").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-gray-500">Write a review...</div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6 mt-6">
        <h3 className="text-xl font-semibold">User Reviews</h3>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No reviews found with the selected filter.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredReviews.map((review) => (
              <motion.div
                key={review.id}
                ref={review.id === newReviewId ? newReviewRef : undefined}
                initial={review.id === newReviewId ? { opacity: 0, y: -20 } : { opacity: 1 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ReviewItem
                  review={review}
                  serviceId={serviceId}
                  replies={replies[review.id] || []}
                  isVisible={isVisible}
                />
              </motion.div>
            ))}
          </AnimatePresence>
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
