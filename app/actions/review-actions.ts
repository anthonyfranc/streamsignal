"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

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

// Function to get reviews for a service
export async function getServiceReviews(serviceId: number, filter = "all"): Promise<Review[]> {
  try {
    // Use the existing server Supabase client
    const supabase = createServerSupabaseClient()

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

// Function to get the total number of reviews for a service
export async function getReviewCount(serviceId: number): Promise<number> {
  try {
    const supabase = createServerSupabaseClient()

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
    const supabase = createServerSupabaseClient()

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

// Function to submit or update a service review
export async function submitServiceReview(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean; review?: Review }> {
  try {
    // Create a new Supabase client for this request
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient()

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

// Function to update likes/dislikes for a review
export async function updateReviewLikes(
  reviewId: number,
  action: "like" | "dislike",
): Promise<{ success: boolean; message: string; requireAuth?: boolean }> {
  try {
    const supabase = createServerSupabaseClient()

    // Get authentication status
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        success: false,
        message: "You must be logged in to rate reviews.",
        requireAuth: true,
      }
    }

    const userId = session.user.id

    // Get the current review
    const { data: review, error: fetchError } = await supabase
      .from("service_reviews")
      .select("likes, dislikes, service_id")
      .eq("id", reviewId)
      .single()

    if (fetchError) {
      console.error("Error fetching review:", fetchError)
      return { success: false, message: "Failed to update review rating" }
    }

    // Update the likes or dislikes
    const updateData = action === "like" ? { likes: (review.likes || 0) + 1 } : { dislikes: (review.dislikes || 0) + 1 }

    const { error: updateError } = await supabase.from("service_reviews").update(updateData).eq("id", reviewId)

    if (updateError) {
      console.error("Error updating review likes:", updateError)
      return { success: false, message: "Failed to update review rating" }
    }

    // Revalidate the service page
    revalidatePath(`/services/${review.service_id}`)

    return { success: true, message: "Rating updated successfully" }
  } catch (error) {
    console.error("Error in updateReviewLikes:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
