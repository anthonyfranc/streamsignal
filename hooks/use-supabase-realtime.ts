"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

type EventType = "INSERT" | "UPDATE" | "DELETE" | "*"

type Filter = {
  column: string
  value: string | number
}

// Add a utility to generate a stable channel name
const generateChannelName = (table: string, filter: Filter | null, id: string | number) => {
  const filterStr = filter ? `_${filter.column}_${filter.value}` : ""
  return `${table}${filterStr}_${id}`
}

/**
 * A hook to subscribe to Supabase realtime changes
 * @param table The table to subscribe to
 * @param event The event type to subscribe to (INSERT, UPDATE, DELETE, *)
 * @param filter Optional filter to apply to the subscription
 * @param callback The callback to run when an event is received
 * @param isVisible Optional flag to control if the subscription is active
 */
export function useSupabaseRealtime<T>(
  table: string,
  event: EventType,
  filter: Filter | null,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  isVisible = true,
) {
  // Use a ref to store the channel to prevent recreation on each render
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Track processed IDs to prevent duplicates
  const processedIdsRef = useRef<Set<number>>(new Set())

  // Track the channel name to prevent unnecessary recreation
  const channelNameRef = useRef<string>(`${table}_${filter?.value || ""}_${Date.now()}`)

  // Track if we're currently in the process of subscribing
  const isSubscribingRef = useRef(false)

  // Track the last visibility state to detect changes
  const lastVisibleRef = useRef(isVisible)

  // Track reconnection attempts for exponential backoff
  const reconnectAttemptsRef = useRef(0)

  // The timeout for reconnection
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Don't recreate the channel if visibility hasn't changed
    if (lastVisibleRef.current === isVisible && channelRef.current) {
      return
    }

    lastVisibleRef.current = isVisible

    // Don't set up subscription if component isn't visible
    if (!isVisible) {
      // If we have a pending reconnection, clear it
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      return
    }

    // If we already have a channel and we're just becoming visible again, return
    if (channelRef.current) {
      console.log(`Reusing existing channel for ${table}`)
      return
    }

    // Prevent multiple simultaneous subscription attempts
    if (isSubscribingRef.current) {
      console.log(`Already subscribing to ${table}, skipping duplicate attempt`)
      return
    }

    // If we've had too many reconnection attempts, back off
    if (reconnectAttemptsRef.current > 5) {
      const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 5), 30000) // max 30 seconds
      console.log(`Backing off for ${backoffTime}ms before attempting to reconnect to ${table}`)

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null
        // Reset the attempt counter slightly to still maintain some backoff
        reconnectAttemptsRef.current = Math.max(5, reconnectAttemptsRef.current - 1)
        // Force recreation on next render
        lastVisibleRef.current = !isVisible
      }, backoffTime)

      return
    }

    isSubscribingRef.current = true

    // Clean up function to remove channel
    const cleanup = () => {
      if (channelRef.current) {
        console.log(`Removing channel for ${table}`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }

    // Create a stable channel name based on table and filter
    const channelId = filter?.value ? `${filter.value}` : "global"
    const channelName = generateChannelName(table, filter, channelId)
    console.log(`Creating channel: ${channelName} for ${table}`)

    // Set up filter object for the subscription
    const filterObject = filter
      ? {
          [filter.column]: `eq.${filter.value}`,
        }
      : {}

    // Create and subscribe to the channel
    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          ...filterObject,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          try {
            // For INSERT events, check if we've already processed this ID to prevent duplicates
            if (payload.eventType === "INSERT" && payload.new && (payload.new as any).id) {
              const id = (payload.new as any).id

              // Skip if we've already processed this ID
              if (processedIdsRef.current.has(id)) {
                console.log(`Already processed ${table} with ID:`, id)
                return
              }

              // Add to processed set
              processedIdsRef.current.add(id)
            }

            // Call the callback with the payload
            callback(payload)
          } catch (error) {
            console.error(`Error processing ${table} realtime update:`, error)
          }
        },
      )
      .subscribe((status) => {
        console.log(`Realtime subscription to ${table} status: ${status}`)
        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed to ${table} changes`)
          isSubscribingRef.current = false
          reconnectAttemptsRef.current = 0 // Reset on successful subscription
        } else if (status === "TIMED_OUT") {
          console.log(`Channel for ${table} timed out, will retry`)
          isSubscribingRef.current = false
          channelRef.current = null

          // Increment attempt counter
          reconnectAttemptsRef.current++

          // Wait a bit before retrying
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            lastVisibleRef.current = !isVisible // Force recreation
          }, 1000)
        } else if (status === "CLOSED") {
          console.log(`Channel for ${table} closed`)
          isSubscribingRef.current = false
          channelRef.current = null

          // Increment attempt counter
          reconnectAttemptsRef.current++
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Error in channel for ${table}`)
          isSubscribingRef.current = false
          channelRef.current = null

          // Increment attempt counter
          reconnectAttemptsRef.current++

          // Wait a bit before retrying
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            lastVisibleRef.current = !isVisible // Force recreation
          }, 1000)
        }
      })

    // Return cleanup function
    return cleanup
  }, [table, event, filter, callback, isVisible])

  // Add a cleanup effect that runs on component unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        console.log(`Unmounting - removing channel for ${table}`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [table])
}
