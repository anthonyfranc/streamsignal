"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient } from "@/lib/supabase-server"

// Define the Review type to match the actual database structure
export interface Review {
  id: number
  service_id: number
  user_id: string
  author_name: string
  title: string
  content: string
  rating: number
  interface_rating: number
  reliability_rating: number
  content_rating: number
  value_rating: number
  likes: number
  dislikes: number
  created_at: string
}

// Interface for review interactions
export interface ReviewInteraction {
  id: number
  review_id: number
  user_id: string
  interaction_type: "like" | "dislike"
  created_at: string
}

// Function to get reviews for a service
export async function getServiceReviews(serviceId: number, filter = "all"): Promise<Review[]> {
  try {
    // Use the server Supabase client with cookies
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Build the query
    let query = supabase
      .from("service_reviews")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false })

    // Apply filtering based on rating
    switch (filter) {
      case "positive":
        query = query.gte("rating", 4)
        break
      case "neutral":
        query = query.eq("rating", 3)
        break
      case "negative":
        query = query.lte("rating", 2)
        break
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching reviews:", error)
      return []
    }

    return data as Review[]
  } catch (error) {
    console.error("Exception fetching reviews:", error)
    return []
  }
}

// Get user interactions for a set of reviews
export async function getUserReviewInteractions(
  userId: string,
  reviewIds: number[],
): Promise<Map<number, "like" | "dislike">> {
  try {
    if (!userId || !reviewIds.length) {
      return new Map()
    }

    console.log(`Fetching interactions for user ${userId} and reviews:`, reviewIds)
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { data, error } = await supabase
      .from("review_interactions")
      .select("review_id, interaction_type")
      .eq("user_id", userId)
      .in("review_id", reviewIds)

    if (error) {
      console.error("Error fetching user review interactions:", error)
      return new Map()
    }

    // Convert the array to a Map for easier lookup
    const interactionsMap = new Map<number, "like" | "dislike">()
    data.forEach((item) => {
      interactionsMap.set(item.review_id, item.interaction_type as "like" | "dislike")
    })

    console.log(`Found ${interactionsMap.size} interactions for user ${userId}`)
    return interactionsMap
  } catch (error) {
    console.error("Exception fetching user review interactions:", error)
    return new Map()
  }
}

// Function to get the total number of reviews for a service
export async function getReviewCount(serviceId: number): Promise<number> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { count, error } = await supabase
      .from("service_reviews")
      .select("*", { count: "exact", head: true })
      .eq("service_id", serviceId)

    if (error) {
      console.error("Error fetching review count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Exception fetching review count:", error)
    return 0
  }
}

// Function to get a user's review for a specific service
export async function getUserReview(serviceId: number, userId: string): Promise<Review | null> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { data, error } = await supabase
      .from("service_reviews")
      .select("*")
      .eq("service_id", serviceId)
      .eq("user_id", userId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null
      }
      console.error("Error fetching user review:", error)
      return null
    }

    return data as Review
  } catch (error) {
    console.error("Exception fetching user review:", error)
    return null
  }
}

// New function to get user's interaction with a specific review
export async function getUserReviewInteraction(reviewId: number, userId: string): Promise<"like" | "dislike" | null> {
  try {
    console.log(`Checking interaction for review ${reviewId} and user ${userId}`)
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { data, error } = await supabase
      .from("review_interactions")
      .select("interaction_type")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        console.log(`No interaction found for review ${reviewId} and user ${userId}`)
        return null
      }
      console.error("Error checking user review interaction:", error)
      return null
    }

    console.log(`Found interaction for review ${reviewId} and user ${userId}:`, data.interaction_type)
    return data.interaction_type as "like" | "dislike"
  } catch (error) {
    console.error("Exception checking user review interaction:", error)
    return null
  }
}

// Add this new function to check if a user has already liked a review
export async function hasUserLikedReview(reviewId: number, userId: string): Promise<boolean> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { data, error } = await supabase
      .from("review_interactions")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .eq("interaction_type", "like")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return false
      }
      console.error("Error checking if user liked review:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("Exception checking if user liked review:", error)
    return false
  }
}

// Function to submit or update a service review
export async function submitServiceReview(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean; review?: Review }> {
  try {
    // Create a new Supabase client for this request
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Debug cookie information
    console.log(
      "Available cookies:",
      cookieStore.getAll().map((c) => c.name),
    )

    // Get authentication status
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Error getting session:", sessionError)
      return {
        success: false,
        message: "Authentication error. Please try logging in again.",
        requireAuth: true,
      }
    }

    // This check should be redundant since the client already checks,
    // but we keep it for security and API usage
    if (!session) {
      console.log("No session found during review submission")

      // Try to get user ID from form data as a fallback
      const userIdFromForm = formData.get("userId") as string

      if (!userIdFromForm) {
        return {
          success: false,
          message: "You must be logged in to submit a review.",
          requireAuth: true,
        }
      }

      console.log("Using user ID from form data:", userIdFromForm)
    }

    // Extract and validate form data
    const userId = session?.user.id || (formData.get("userId") as string)

    if (!userId) {
      return {
        success: false,
        message: "User ID is required. Please log in again.",
        requireAuth: true,
      }
    }

    const serviceIdRaw = formData.get("serviceId")

    if (!serviceIdRaw) {
      console.error("Missing serviceId in form data")
      return {
        success: false,
        message: "Missing service information. Please try again.",
      }
    }

    const serviceId = Number.parseInt(serviceIdRaw as string)

    if (isNaN(serviceId)) {
      console.error("Invalid serviceId:", serviceIdRaw)
      return {
        success: false,
        message: "Invalid service information. Please try again.",
      }
    }

    // Get author name with fallbacks
    const authorName =
      (formData.get("authorName") as string) ||
      (session?.user.user_metadata?.name as string) ||
      (session?.user.email?.split("@")[0] as string) ||
      "Anonymous"

    // Extract other form fields
    const title = formData.get("title") as string
    const content = formData.get("content") as string

    // Parse and validate ratings
    const ratingRaw = formData.get("rating")
    const interfaceRatingRaw = formData.get("interfaceRating")
    const reliabilityRatingRaw = formData.get("reliabilityRating")
    const contentRatingRaw = formData.get("contentRating")
    const valueRatingRaw = formData.get("valueRating")

    // Log raw form data for debugging
    console.log("Review form data:", {
      serviceId,
      userId,
      title,
      content,
      ratingRaw,
      interfaceRatingRaw,
      reliabilityRatingRaw,
      contentRatingRaw,
      valueRatingRaw,
    })

    // Convert ratings to numbers with validation
    const rating = ratingRaw ? Number.parseInt(ratingRaw as string) : 0
    const interfaceRating = interfaceRatingRaw ? Number.parseInt(interfaceRatingRaw as string) : 0
    const reliabilityRating = reliabilityRatingRaw ? Number.parseInt(reliabilityRatingRaw as string) : 0
    const contentRating = contentRatingRaw ? Number.parseInt(contentRatingRaw as string) : 0
    const valueRating = valueRatingRaw ? Number.parseInt(valueRatingRaw as string) : 0

    // Validation
    if (!title || title.trim().length < 3) {
      return {
        success: false,
        message: "Please provide a review title (minimum 3 characters).",
      }
    }

    if (!content || content.trim().length < 10) {
      return {
        success: false,
        message: "Please provide review content (minimum 10 characters).",
      }
    }

    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return {
        success: false,
        message: "Please provide an overall rating between 1 and 5.",
      }
    }

    // Check if the user already has a review for this service
    const existingReview = await getUserReview(serviceId, userId)
    console.log("Existing review check:", existingReview ? "Found" : "Not found")

    // Prepare review data - match the actual database schema
    const reviewData = {
      service_id: serviceId,
      user_id: userId,
      author_name: authorName,
      title: title.trim(),
      content: content.trim(),
      rating,
      interface_rating: interfaceRating || 0,
      reliability_rating: reliabilityRating || 0,
      content_rating: contentRating || 0,
      value_rating: valueRating || 0,
    }

    let result
    if (existingReview) {
      // Update existing review
      console.log("Updating existing review:", existingReview.id)
      const { data, error } = await supabase
        .from("service_reviews")
        .update(reviewData)
        .eq("id", existingReview.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating review:", error)
        return {
          success: false,
          message: `Failed to update your review: ${error.message}`,
        }
      }

      result = {
        success: true,
        message: "Your review has been updated!",
        review: data,
      }
    } else {
      // Insert new review
      console.log("Inserting new review")
      const { data, error } = await supabase
        .from("service_reviews")
        .insert({
          ...reviewData,
          likes: 0,
          dislikes: 0,
        })
        .select()
        .single()

      if (error) {
        console.error("Error submitting review:", error)
        return {
          success: false,
          message: `Failed to submit your review: ${error.message}`,
        }
      }

      console.log("Review inserted successfully:", data)
      result = {
        success: true,
        message: "Your review has been submitted successfully!",
        review: data,
      }
    }

    // Revalidate the service page
    revalidatePath(`/services/${serviceId}`)

    return result
  } catch (error) {
    console.error("Exception in submitServiceReview:", error)
    return {
      success: false,
      message:
        error instanceof Error
          ? `An error occurred: ${error.message}`
          : "An unexpected error occurred. Please try again.",
    }
  }
}

// Helper function to diagnose authentication issues
export async function checkAuthenticationStatus(): Promise<{
  authenticated: boolean
  userId?: string
  error?: string
  sessionData?: any
  cookies?: string[]
}> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Log all available cookies for debugging
    const allCookies = cookieStore.getAll()
    const cookieNames = allCookies.map((c) => c.name)
    console.log("[SERVER] Available cookies:", cookieNames)

    // Check for specific auth cookies
    const hasAuthCookie = cookieNames.some((name) => name.includes("auth") || name.includes("supabase"))
    console.log("[SERVER] Has auth cookies:", hasAuthCookie)

    console.log("[SERVER] Checking authentication status...")
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("[SERVER] Error checking auth status:", error)
      return {
        authenticated: false,
        error: error.message,
        cookies: cookieNames,
      }
    }

    if (!data.session) {
      console.log("[SERVER] No session found in auth check")
      return {
        authenticated: false,
        error: "No session found",
        cookies: cookieNames,
      }
    }

    console.log(`[SERVER] Session found for user: ${data.session.user.id}`)
    return {
      authenticated: true,
      userId: data.session.user.id,
      sessionData: {
        expires_at: data.session.expires_at,
        last_refreshed_at: data.session.last_refreshed_at,
      },
      cookies: cookieNames,
    }
  } catch (err) {
    console.error("[SERVER] Exception in checkAuthenticationStatus:", err)
    return {
      authenticated: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// Updated function to handle review likes/dislikes with proper tracking
export async function updateReviewLikes(
  reviewId: number,
  action: "like" | "dislike",
): Promise<{
  success: boolean
  message: string
  requireAuth?: boolean
  alreadyInteracted?: boolean
  currentInteraction?: "like" | "dislike" | null
  diagnostics?: any
}> {
  try {
    console.log(`[SERVER] ========== START INTERACTION UPDATE ==========`)
    console.log(`[SERVER] Processing ${action} for review ${reviewId}`)

    // Get the cookie store
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Log all available cookies for debugging
    const allCookies = cookieStore.getAll()
    const cookieNames = allCookies.map((c) => c.name)
    console.log("[SERVER] Available cookies for interaction:", cookieNames)

    // Get authentication status
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("[SERVER] Error getting session:", sessionError)
      return {
        success: false,
        message: "Authentication error. Please try logging in again.",
        requireAuth: true,
        diagnostics: { sessionError },
      }
    }

    // Check if user is authenticated
    if (!session || !session.user) {
      console.log("[SERVER] No valid session found during like/dislike action")
      return {
        success: false,
        message: "You must be logged in to rate reviews.",
        requireAuth: true,
        diagnostics: { cookieNames },
      }
    }

    const userId = session.user.id
    console.log(`[SERVER] User ID from session: ${userId}`)

    // Verify the user ID is valid
    if (!userId) {
      console.log("[SERVER] Invalid user ID found in session")
      return {
        success: false,
        message: "Invalid user authentication. Please try logging in again.",
        requireAuth: true,
      }
    }

    // STEP 1: Get review data and verify it exists
    const { data: reviewData, error: reviewError } = await supabase
      .from("service_reviews")
      .select("id, user_id, service_id, likes, dislikes")
      .eq("id", reviewId)
      .single()

    if (reviewError) {
      console.error(`[SERVER] Error fetching review ${reviewId}:`, reviewError)
      return {
        success: false,
        message: "Failed to find the specified review.",
        diagnostics: { reviewError },
      }
    }

    // Check if this is a self-like
    const isSelfLike = reviewData.user_id === userId
    console.log(`[SERVER] Review owner: ${reviewData.user_id}, Self-like: ${isSelfLike ? "YES" : "NO"}`)

    // STEP 2: Check for existing interaction
    const { data: existingInteractionData, error: existingInteractionError } = await supabase
      .from("review_interactions")
      .select("id, interaction_type, created_at")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existingInteractionError) {
      console.error(`[SERVER] Error checking existing interaction:`, existingInteractionError)
      // We continue even with an error, assuming no interaction exists
    }

    const existingInteraction = existingInteractionData?.interaction_type as "like" | "dislike" | null
    console.log(`[SERVER] Existing interaction: ${existingInteraction || "NONE"}`)

    // If user has already performed the same action, prevent duplicate
    if (existingInteraction === action) {
      console.log(`[SERVER] User has already ${action}d this review - no change needed`)
      return {
        success: true, // Return success but with alreadyInteracted flag
        message: `You have already ${action}d this review.`,
        alreadyInteracted: true,
        currentInteraction: existingInteraction,
      }
    }

    // STEP 3: Handle the database updates directly to avoid relying on stored procedures

    // Start with calculating the new counts
    let newLikes = reviewData.likes || 0
    let newDislikes = reviewData.dislikes || 0

    // First adjust for removing previous interaction if any
    if (existingInteraction) {
      if (existingInteraction === "like") {
        newLikes = Math.max(0, newLikes - 1)
        console.log(`[SERVER] Removing previous like, new likes count: ${newLikes}`)
      } else {
        newDislikes = Math.max(0, newDislikes - 1)
        console.log(`[SERVER] Removing previous dislike, new dislikes count: ${newDislikes}`)
      }
    }

    // Then adjust for adding new interaction
    if (action === "like") {
      newLikes += 1
      console.log(`[SERVER] Adding new like, final likes count: ${newLikes}`)
    } else {
      newDislikes += 1
      console.log(`[SERVER] Adding new dislike, final dislikes count: ${newDislikes}`)
    }

    // Update the counts in the review record
    const { error: updateCountsError } = await supabase
      .from("service_reviews")
      .update({
        likes: newLikes,
        dislikes: newDislikes,
      })
      .eq("id", reviewId)

    if (updateCountsError) {
      console.error(`[SERVER] Error updating review counts:`, updateCountsError)
      return {
        success: false,
        message: "Failed to update the review counts.",
        diagnostics: { updateCountsError },
      }
    }

    console.log(`[SERVER] Successfully updated review counts`)

    // Handle the interaction record - either update or insert
    let interactionResult

    if (existingInteractionData) {
      // Update existing record
      const { data, error } = await supabase
        .from("review_interactions")
        .update({
          interaction_type: action,
        })
        .eq("id", existingInteractionData.id)
        .select()

      interactionResult = { data, error, method: "update" }
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("review_interactions")
        .insert({
          review_id: reviewId,
          user_id: userId,
          interaction_type: action,
        })
        .select()

      interactionResult = { data, error, method: "insert" }
    }

    if (interactionResult.error) {
      console.error(`[SERVER] Error ${interactionResult.method}ing interaction record:`, interactionResult.error)
      return {
        success: false,
        message: `Failed to record your ${action}.`,
        diagnostics: { interactionError: interactionResult.error },
      }
    }

    console.log(`[SERVER] Successfully ${interactionResult.method}ed interaction record`)

    // Revalidate the page
    revalidatePath(`/services/${reviewData.service_id}`)

    console.log(`[SERVER] ========== INTERACTION UPDATE COMPLETED SUCCESSFULLY ==========`)

    return {
      success: true,
      message: `Your ${action} has been recorded.`,
      currentInteraction: action,
      diagnostics: {
        review: reviewData,
        interactionResult,
        finalCounts: { likes: newLikes, dislikes: newDislikes },
      },
    }
  } catch (error) {
    console.error("[SERVER] Exception in updateReviewLikes:", error)
    return {
      success: false,
      message: "An unexpected error occurred",
      diagnostics: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    }
  }
}
