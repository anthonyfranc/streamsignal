"use client"

import { useState, useEffect } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type SubscriptionCallback<T> = (payload: { new: T; old: T | null }) => void

export function useSupabaseRealtime<T = any>(
  table: string,
  event: "INSERT" | "UPDATE" | "DELETE" | "*" = "*",
  filter?: { column: string; value: any },
  callback?: SubscriptionCallback<T>,
) {
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null)
  const [data, setData] = useState<T[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let channel: RealtimeChannel

    const setupSubscription = async () => {
      try {
        setIsLoading(true)

        // Create a channel with a specific name for this subscription
        const channelName = filter ? `${table}:${filter.column}:eq:${filter.value}` : `${table}:all`

        // Set up the subscription
        channel = supabase.channel(channelName)

        // Build the filter
        const query = supabase.channel(channelName).on(
          "postgres_changes",
          {
            event: event,
            schema: "public",
            table: table,
          },
          (payload) => {
            // If a filter is specified, check if the payload matches
            if (filter) {
              const newRecord = payload.new as any
              if (newRecord[filter.column] !== filter.value) {
                return
              }
            }

            // Call the callback if provided
            if (callback) {
              callback(payload as any)
            }

            // Update the internal state based on the event type
            if (payload.eventType === "INSERT") {
              setData((prev) => [...prev, payload.new as T])
            } else if (payload.eventType === "UPDATE") {
              setData((prev) =>
                prev.map((item) => ((item as any).id === (payload.new as any).id ? (payload.new as T) : item)),
              )
            } else if (payload.eventType === "DELETE") {
              setData((prev) => prev.filter((item) => (item as any).id !== (payload.old as any).id))
            }
          },
        )

        // Subscribe to the channel
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log(`Subscribed to ${channelName}`)
          }
        })

        setSubscription(channel)
      } catch (err) {
        console.error("Error setting up real-time subscription:", err)
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setIsLoading(false)
      }
    }

    setupSubscription()

    // Cleanup function
    return () => {
      if (channel) {
        console.log("Unsubscribing from channel")
        supabase.removeChannel(channel)
      }
    }
  }, [table, event, filter ? JSON.stringify(filter) : ""])

  return { subscription, data, error, isLoading }
}
