"use server"

import { createClient } from "@/lib/supabase-server"

interface ServiceRatings {
  overall: number
  content: number
  value: number
  interface: number
  reliability: number
}

export async function calculateServiceRatings(serviceId: number): Promise<ServiceRatings> {
  try {
    const supabase = await createClient()

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from("streaming_services")
      .select("*")
      .eq("id", serviceId)
      .single()

    if (serviceError || !service) {
      console.error("Error fetching service:", serviceError)
      return getDefaultRatings()
    }

    // Get service reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from("service_reviews")
      .select("*")
      .eq("service_id", serviceId)

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError)
      return getDefaultRatings()
    }

    // Get channel count
    const { count: channelCount, error: channelError } = await supabase
      .from("service_channels")
      .select("*", { count: "exact", head: true })
      .eq("service_id", serviceId)

    if (channelError) {
      console.error("Error counting channels:", channelError)
      return getDefaultRatings()
    }

    // Get content categories count
    const { count: categoriesCount, error: categoriesError } = await supabase
      .from("content_categories")
      .select("*", { count: "exact", head: true })
      .eq("service_id", serviceId)

    if (categoriesError) {
      console.error("Error counting categories:", categoriesError)
      return getDefaultRatings()
    }

    // Calculate content rating
    let contentRating = 3.0 // Default

    // If we have user-provided content ratings, use the average
    if (reviews && reviews.length > 0) {
      const contentRatings = reviews
        .filter((review) => review.content_rating !== null)
        .map((review) => review.content_rating)

      if (contentRatings.length > 0) {
        contentRating = contentRatings.reduce((sum, rating) => sum + rating, 0) / contentRatings.length
      } else {
        // Calculate based on service attributes
        contentRating = calculateContentRating(service, channelCount || 0, categoriesCount || 0)
      }
    } else {
      // Calculate based on service attributes
      contentRating = calculateContentRating(service, channelCount || 0, categoriesCount || 0)
    }

    // Calculate value rating
    let valueRating = 3.0 // Default

    // If we have user-provided value ratings, use the average
    if (reviews && reviews.length > 0) {
      const valueRatings = reviews.filter((review) => review.value_rating !== null).map((review) => review.value_rating)

      if (valueRatings.length > 0) {
        valueRating = valueRatings.reduce((sum, rating) => sum + rating, 0) / valueRatings.length
      } else {
        // Calculate based on service attributes
        valueRating = calculateValueRating(service, channelCount || 0, categoriesCount || 0)
      }
    } else {
      // Calculate based on service attributes
      valueRating = calculateValueRating(service, channelCount || 0, categoriesCount || 0)
    }

    // Calculate interface rating
    let interfaceRating = 3.5 // Default

    // If we have user-provided interface ratings, use the average
    if (reviews && reviews.length > 0) {
      const interfaceRatings = reviews
        .filter((review) => review.interface_rating !== null)
        .map((review) => review.interface_rating)

      if (interfaceRatings.length > 0) {
        interfaceRating = interfaceRatings.reduce((sum, rating) => sum + rating, 0) / interfaceRatings.length
      }
    }

    // Calculate reliability rating
    let reliabilityRating = 3.5 // Default

    // If we have user-provided reliability ratings, use the average
    if (reviews && reviews.length > 0) {
      const reliabilityRatings = reviews
        .filter((review) => review.reliability_rating !== null)
        .map((review) => review.reliability_rating)

      if (reliabilityRatings.length > 0) {
        reliabilityRating = reliabilityRatings.reduce((sum, rating) => sum + rating, 0) / reliabilityRatings.length
      }
    }

    // Calculate overall rating (weighted average)
    const overallRating =
      contentRating * 0.35 + // 35% weight for content
      valueRating * 0.35 + // 35% weight for value
      interfaceRating * 0.15 + // 15% weight for interface
      reliabilityRating * 0.15 // 15% weight for reliability

    return {
      overall: Math.min(5, Math.max(1, overallRating)),
      content: Math.min(5, Math.max(1, contentRating)),
      value: Math.min(5, Math.max(1, valueRating)),
      interface: Math.min(5, Math.max(1, interfaceRating)),
      reliability: Math.min(5, Math.max(1, reliabilityRating)),
    }
  } catch (error) {
    console.error("Error calculating service ratings:", error)
    return getDefaultRatings()
  }
}

// Helper function to calculate content rating based on service attributes
function calculateContentRating(service: any, channelCount: number, categoriesCount: number): number {
  let rating = 3.0 // Default

  // Base rating on content structure type
  switch (service.content_structure_type) {
    case "channels":
      // More channels = higher rating
      if (channelCount > 100) rating = 4.5
      else if (channelCount > 50) rating = 4.0
      else if (channelCount > 20) rating = 3.5
      else rating = 3.0
      break

    case "categories":
      // More categories = higher rating
      if (categoriesCount > 10) rating = 4.5
      else if (categoriesCount > 5) rating = 4.0
      else if (categoriesCount > 2) rating = 3.5
      else rating = 3.0
      break

    case "hybrid":
      // Hybrid gets a bonus
      rating = Math.max(
        3.5,
        (calculateContentRating({ content_structure_type: "channels" }, channelCount, 0) +
          calculateContentRating({ content_structure_type: "categories" }, 0, categoriesCount)) /
          2,
      )
      break

    case "add_ons":
      // Add-ons typically have less content
      rating = 3.0
      break

    default:
      rating = 3.0
  }

  // Adjust for original content
  if (service.has_original_content) {
    rating += 0.5
  }

  return Math.min(5, Math.max(1, rating))
}

// Helper function to calculate value rating based on service attributes
function calculateValueRating(service: any, channelCount: number, categoriesCount: number): number {
  let rating = 3.0 // Default

  // Base rating on price vs. content
  const contentScore = calculateContentRating(service, channelCount, categoriesCount)
  const priceScore = 5 - Math.min(5, service.monthly_price / 10) // Lower price = higher score

  // Average of content and price scores
  rating = (contentScore + priceScore) / 2

  // Adjust for features
  if (!service.has_ads) rating += 0.3 // Ad-free is better value
  if (service.max_streams > 2) rating += 0.2 // More streams is better value
  if (service.supports_4k) rating += 0.2 // 4K support is better value
  if (service.has_offline_viewing) rating += 0.2 // Offline viewing is better value

  return Math.min(5, Math.max(1, rating))
}

// Default ratings if calculation fails
function getDefaultRatings(): ServiceRatings {
  return {
    overall: 3.5,
    content: 3.5,
    value: 3.5,
    interface: 3.5,
    reliability: 3.5,
  }
}
