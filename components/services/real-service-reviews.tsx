"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { ServiceReviews } from "./service-reviews"

interface RealServiceReviewsProps {
  serviceId: number
}

export function RealServiceReviews({ serviceId }: RealServiceReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true)

        // Fetch approved reviews for this service
        const { data, error } = await supabase
          .from("service_reviews")
          .select(`
            id,
            service_id,
            user_id,
            author_name,
            rating,
            title,
            content,
            interface_rating,
            reliability_rating,
            content_rating,
            value_rating,
            likes,
            dislikes,
            created_at,
            user_profiles(avatar_url)
          `)
          .eq("service_id", serviceId)
          .eq("status", "approved")
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        setReviews(data || [])
      } catch (err: any) {
        console.error("Error fetching reviews:", err)
        setError(err.message || "Failed to load reviews")
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [serviceId])

  // For now, we'll just pass the serviceId to the ServiceReviews component
  // In a real implementation, you would pass the fetched reviews as well
  return <ServiceReviews serviceId={serviceId} />
}
