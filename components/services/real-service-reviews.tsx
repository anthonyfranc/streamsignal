"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/hooks/use-supabase"
import { ServiceReviews } from "./service-reviews"

export function RealServiceReviews({ serviceId }: { serviceId: string }) {
  const supabase = useSupabase()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return

    async function fetchReviews() {
      const { data, error } = await supabase.from("reviews").select("*").eq("service_id", serviceId)

      if (!error && data) {
        setReviews(data)
      }
      setLoading(false)
    }

    fetchReviews()
  }, [serviceId, supabase])

  // For now, we'll just pass the serviceId to the ServiceReviews component
  // In a real implementation, you would pass the fetched reviews as well
  return <ServiceReviews serviceId={serviceId} />
}
