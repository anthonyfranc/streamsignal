"use server"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import type { Review } from "@/types/reviews"

export async function submitServiceReview(
  formData: FormData,
): Promise<{ success: boolean; message: string; requireAuth?: boolean; reviewId?: number }> {
  try {
    // Create a Supabase client with the cookies
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return {
        success: false,
        message: "You must be logged in to submit a review",
        requireAuth: true,
      }
    }

    // Extract and validate data
    const serviceId = Number.parseInt(formData.get("serviceId") as string)
    const title = formData.get("title") as string
    const content = formData.get("content") as string
    const rating = Number.parseInt(formData.get("rating") as string)
    const interfaceRating = Number.parseInt(formData.get("interfaceRating") as string)
    const reliabilityRating = Number.parseInt(formData.get("reliabilityRating") as string)
    const contentRating = Number.parseInt(formData.get("contentRating") as string)
    const valueRating = Number.parseInt(formData.get("valueRating") as string)

    // Get user's name from their profile
    let authorName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || ""

    // If no name is found in metadata, try to get it from user_profiles
    if (!authorName) {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single()

      if (profileData && profileData.full_name) {
        authorName = profileData.full_name
      } else {
        // Fallback to email username if no name is found
        authorName = session.user.email?.split("@")[0] || "User"
      }
    }

    // Basic validation
    if (!serviceId || isNaN(serviceId)) {
      return { success: false, message: "Invalid service ID" }
    }

    if (!title || title.trim().length < 1) {
      return { success: false, message: "Please provide a review title" }
    }

    if (!content || content.trim().length < 1) {
      return { success: false, message: "Please provide review content" }
    }

    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return { success: false, message: "Please provide a valid rating (1-5)" }
    }

    // Check if the user has already reviewed this service
    const { data: existingReview, error: existingReviewError } = await supabase
      .from("service_reviews")
      .select("id")
      .eq("service_id", serviceId)
      .eq("user_id", session.user.id)
      .single()

    if (existingReview) {
      return { success: false, message: "You have already reviewed this service" }
    }

    // Insert review into database
    const { data: insertedReview, error } = await supabase
      .from("service_reviews")
      .insert({
        service_id: serviceId,
        user_id: session.user.id,
        author_name: authorName,
        title,
        content,
        rating,
        interface_rating: interfaceRating,
        reliability_rating: reliabilityRating,
        content_rating: contentRating,
        value_rating: valueRating,
        likes: 0,
        dislikes: 0,
        status: "approved", // Set to approved for immediate display
      })
      .select()
      .single()

    if (error) {
      console.error("Error submitting review:", error)
      return { success: false, message: "Failed to submit review. Please try again." }
    }

    // Revalidate the service page to show the new review
    revalidatePath(`/services/${serviceId}`)

    return {
      success: true,
      message: "Your review has been submitted successfully!",
      reviewId: insertedReview.id,
    }
  } catch (error) {
    console.error("Error in submitServiceReview:", error)
    return { success: false, message: "An unexpected error occurred. Please try again." }
  }
}

export async function getServiceReviews(serviceId: number): Promise<Review[]> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    // Fetch approved reviews for this service
    const { data, error } = await supabase
      .from("service_reviews")
      .select("*")
      .eq("service_id", serviceId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching reviews:", error)
      return []
    }

    // For each review, fetch the user profile
    const reviewsWithProfiles = await Promise.all(
      data.map(async (review) => {
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

    return reviewsWithProfiles
  } catch (error) {
    console.error("Error in getServiceReviews:", error)
    return []
  }
}
