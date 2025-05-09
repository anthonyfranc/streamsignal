"use client"

import { useState, useEffect } from "react"
import { supabaseClient } from "@/utils/supabase-client"

export function useSupabaseRealtime<T>(
  tableName: string,
  initialData: T[],
  options?: {
    event?: "INSERT" | "UPDATE" | "DELETE" | "*"
    filter?: string
    filterValue?: any
  },
) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Update state when initialData changes (e.g., from a new server fetch)
    setData(initialData)
  }, [initialData])

  useEffect(() => {
    const event = options?.event || "*"

    // Set up realtime subscription
    const channel = supabaseClient
      .channel(`${tableName}-changes`)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table: tableName,
          ...(options?.filter && options?.filterValue ? { filter: `${options.filter}=eq.${options.filterValue}` } : {}),
        },
        (payload) => {
          try {
            console.log(`Realtime ${event} event on ${tableName}:`, payload)

            if (event === "*" || event === "INSERT") {
              if (payload.eventType === "INSERT") {
                // Add new record to the data array
                setData((currentData) => [...currentData, payload.new as T])
              }
            }

            if (event === "*" || event === "UPDATE") {
              if (payload.eventType === "UPDATE") {
                // Update existing record in the data array
                setData((currentData) =>
                  currentData.map((item) => {
                    // @ts-ignore - we don't know the shape of T
                    if (item.id === payload.new.id) {
                      return payload.new as T
                    }
                    return item
                  }),
                )
              }
            }

            if (event === "*" || event === "DELETE") {
              if (payload.eventType === "DELETE") {
                // Remove deleted record from the data array
                setData((currentData) =>
                  currentData.filter((item) => {
                    // @ts-ignore - we don't know the shape of T
                    return item.id !== payload.old.id
                  }),
                )
              }
            }
          } catch (err) {
            console.error("Error handling realtime update:", err)
            setError(err instanceof Error ? err : new Error(String(err)))
          }
        },
      )
      .subscribe((status) => {
        console.log(`Realtime subscription to ${tableName} status:`, status)
        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed to ${tableName} changes`)
        }
      })

    return () => {
      // Clean up subscription when component unmounts
      supabaseClient.channel(channel.subscription.topic).unsubscribe()
    }
  }, [tableName, options?.event, options?.filter, options?.filterValue])

  return { data, loading, error, setData }
}
