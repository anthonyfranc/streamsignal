"use server"

import { supabase } from "@/lib/supabase"
import type { StreamingService } from "@/types/streaming"

export interface ServiceRatings {
  overall: number
  content: number
  value: number
  interface: number
  reliability: number
}

export async function calculateServiceRatings(serviceId: number): Promise<ServiceRatings> {
  try {
    // Fetch the service details
    const { data: service, error: serviceError } = await supabase
      .from("streaming_services")
      .select("*")
      .eq("id", serviceId)
      .single()

    if (serviceError) throw serviceError

    // Fetch channel count
    const { count: channelCount, error: channelError } = await supabase
      .from("service_channels")
      .select("*", { count: "exact", head: true })
      .eq("service_id", serviceId)

    if (channelError) throw channelError

    // Fetch content categories and items
    const { data: categories, error: categoriesError } = await supabase
      .from("content_categories")
      .select("*, items:content_items(*)")
      .eq("service_id", serviceId)

    if (categoriesError) throw categoriesError

    // Count total content items
    let contentItemCount = 0
    categories?.forEach((category) => {
      contentItemCount += category.items?.length || 0
    })

    // Fetch user reviews if available
    const { data: reviews, error: reviewsError } = await supabase
      .from("service_reviews")
      .select("rating, interface_rating, reliability_rating")
      .eq("service_id", serviceId)

    // Calculate content rating (based on content quantity and diversity)
    const contentRating = calculateContentRating(service, channelCount || 0, contentItemCount, categories?.length || 0)

    // Calculate value rating (price vs. content)
    const valueRating = calculateValueRating(service, channelCount || 0, contentItemCount)

    // Calculate interface and reliability ratings (from reviews or defaults)
    const { interfaceRating, reliabilityRating } = calculateUserExperienceRatings(reviews || [])

    // Calculate overall rating (weighted average)
    const overall = calculateOverallRating(contentRating, valueRating, interfaceRating, reliabilityRating)

    return {
      overall,
      content: contentRating,
      value: valueRating,
      interface: interfaceRating,
      reliability: reliabilityRating,
    }
  } catch (error) {
    console.error("Error calculating service ratings:", error)

    // Return default ratings if calculation fails
    return {
      overall: 3.5,
      content: 3.5,
      value: 3.5,
      interface: 3.5,
      reliability: 3.5,
    }
  }
}

// Helper functions for rating calculations

function calculateContentRating(
  service: StreamingService,
  channelCount: number,
  contentItemCount: number,
  categoryCount: number,
): number {
  // Base rating starts at 3
  let rating = 3.0

  // Adjust based on content structure type and quantity
  if (service.content_structure_type === "channels") {
    // For channel-based services
    if (channelCount > 100) rating += 1.5
    else if (channelCount > 50) rating += 1.0
    else if (channelCount > 20) rating += 0.5
  } else if (service.content_structure_type === "categories") {
    // For category-based services (like Netflix)
    if (contentItemCount > 1000) rating += 1.5
    else if (contentItemCount > 500) rating += 1.0
    else if (contentItemCount > 100) rating += 0.5

    // Bonus for category diversity
    if (categoryCount > 10) rating += 0.5
  } else if (service.content_structure_type === "hybrid") {
    // For hybrid services
    const hybridScore = channelCount / 100 + contentItemCount / 1000
    if (hybridScore > 2) rating += 1.5
    else if (hybridScore > 1) rating += 1.0
    else if (hybridScore > 0.5) rating += 0.5
  }

  // Cap at 5.0
  return Math.min(5.0, rating)
}

function calculateValueRating(service: StreamingService, channelCount: number, contentItemCount: number): number {
  // Base rating
  let rating = 3.0

  // Calculate content per dollar
  const monthlyPrice = service.monthly_price || 9.99
  const contentPerDollar =
    service.content_structure_type === "channels" ? channelCount / monthlyPrice : contentItemCount / monthlyPrice

  // Adjust rating based on value
  if (service.content_structure_type === "channels") {
    if (contentPerDollar > 10)
      rating += 1.5 // More than 10 channels per dollar
    else if (contentPerDollar > 5) rating += 1.0
    else if (contentPerDollar > 2) rating += 0.5
  } else {
    if (contentPerDollar > 100)
      rating += 1.5 // More than 100 content items per dollar
    else if (contentPerDollar > 50) rating += 1.0
    else if (contentPerDollar > 20) rating += 0.5
  }

  // Adjust for additional features
  if (service.has_4k) rating += 0.3
  if (!service.has_ads) rating += 0.3
  if (service.max_streams > 3) rating += 0.3

  // Cap at 5.0
  return Math.min(5.0, rating)
}

function calculateUserExperienceRatings(reviews: any[]): { interfaceRating: number; reliabilityRating: number } {
  // Default ratings if no reviews
  if (!reviews.length) {
    return {
      interfaceRating: 3.8,
      reliabilityRating: 3.8,
    }
  }

  // Calculate average ratings from reviews
  let interfaceSum = 0
  let reliabilitySum = 0
  let interfaceCount = 0
  let reliabilityCount = 0

  reviews.forEach((review) => {
    if (review.interface_rating) {
      interfaceSum += review.interface_rating
      interfaceCount++
    }

    if (review.reliability_rating) {
      reliabilitySum += review.reliability_rating
      reliabilityCount++
    }
  })

  const interfaceRating = interfaceCount > 0 ? interfaceSum / interfaceCount : 3.8
  const reliabilityRating = reliabilityCount > 0 ? reliabilitySum / reliabilityCount : 3.8

  return { interfaceRating, reliabilityRating }
}

function calculateOverallRating(
  contentRating: number,
  valueRating: number,
  interfaceRating: number,
  reliabilityRating: number,
): number {
  // Weighted average (content and value are more important)
  const overall = contentRating * 0.35 + valueRating * 0.35 + interfaceRating * 0.15 + reliabilityRating * 0.15

  // Round to 1 decimal place
  return Math.round(overall * 10) / 10
}
