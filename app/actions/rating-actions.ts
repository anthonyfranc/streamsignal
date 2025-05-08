"use server"

import { createServerSupabaseClient } from "@/utils/supabase/server"

interface ServiceRatings {
  overall: number
  content: number
  value: number
  interface: number
  reliability: number
  reviewCount: number
}

export async function calculateServiceRatings(serviceId: number): Promise<ServiceRatings> {
  try {
    const supabase = createServerSupabaseClient()

    // Get all reviews for this service
    const { data: reviews, error } = await supabase
      .from("service_reviews")
      .select("rating, content_rating, value_rating, interface_rating, reliability_rating")
      .eq("service_id", serviceId)

    if (error) {
      console.error("Error fetching reviews for ratings:", error)
      return {
        overall: 0,
        content: 0,
        value: 0,
        interface: 0,
        reliability: 0,
        reviewCount: 0,
      }
    }

    // If no reviews, return default ratings
    if (!reviews || reviews.length === 0) {
      return {
        overall: 0,
        content: 0,
        value: 0,
        interface: 0,
        reliability: 0,
        reviewCount: 0,
      }
    }

    // Calculate average ratings
    const reviewCount = reviews.length

    // Calculate sum of all ratings
    const ratingSum = reviews.reduce((sum, review) => sum + (review.rating || 0), 0)
    const contentSum = reviews.reduce((sum, review) => sum + (review.content_rating || 0), 0)
    const valueSum = reviews.reduce((sum, review) => sum + (review.value_rating || 0), 0)
    const interfaceSum = reviews.reduce((sum, review) => sum + (review.interface_rating || 0), 0)
    const reliabilitySum = reviews.reduce((sum, review) => sum + (review.reliability_rating || 0), 0)

    // Calculate averages
    const overall = ratingSum / reviewCount
    const content = contentSum / reviewCount
    const value = valueSum / reviewCount
    const interface_rating = interfaceSum / reviewCount
    const reliability = reliabilitySum / reviewCount

    return {
      overall,
      content,
      value,
      interface: interface_rating,
      reliability,
      reviewCount,
    }
  } catch (error) {
    console.error("Error calculating service ratings:", error)
    return {
      overall: 0,
      content: 0,
      value: 0,
      interface: 0,
      reliability: 0,
      reviewCount: 0,
    }
  }
}
