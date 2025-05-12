"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import type { Review, Reply } from "@/types/reviews"

type EventType = "INSERT" | "UPDATE" | "DELETE" | "*"

type ReviewChannelCallbacks = {
  onReviewChange?: (payload: RealtimePostgresChangesPayload<Review>) => void
  onReplyChange?: (payload: RealtimePostgresChangesPayload<Reply>) => void
  onVoteChange?: (payload: RealtimePostgresChangesPayload<any>) => void
}

/**
 * A hook that manages centralized Supabase channels for reviews
 * Creates only two channels: one for reviews/replies and one for votes
 * @param serviceId The service ID to subscribe to
 * @param callbacks Callback functions for different event types
 * @param isVisible Whether the component is currently visible
 */
export function useReviewChannels(serviceId: number, callbacks: ReviewChannelCallbacks, isVisible = true) {
  // Use refs to store channel instances
  const contentChannelRef = useRef<RealtimeChannel | null>(null)
  const voteChannelRef = useRef<RealtimeChannel | null>(null)

  // Track if we're currently in the process of subscribing
  const isSubscribingRef = useRef(false)

  // Track the last visibility state to detect changes
  const lastVisibleRef = useRef(isVisible)

  // Track reconnection attempts for exponential backoff
  const reconnectAttemptsRef = useRef(0)

  // The timeout for reconnection
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track if we've initialized the channels
  const isInitializedRef = useRef(false)

  // Debounce timer for visibility changes
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cooldown timer to prevent rapid channel creation/removal cycles
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inCooldownRef = useRef(false)

  // Track processed IDs to prevent duplicates
  const processedIdsRef = useRef<{
    reviews: Set<number>
    replies: Set<number>
    votes: Set<string>
  }>({
    reviews: new Set(),
    replies: new Set(),
    votes: new Set(),
  })

  // Track the component mount status to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Add a state to force re-renders when needed
  const [channelsActive, setChannelsActive] = useState(false)

  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true

    // Cleanup function
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false

      // Clean up all timers and channels
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current)
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
      }

      cleanupChannels("unmount")
    }
  }, [])

  useEffect(() => {
    // Use a debounce for visibility changes to prevent rapid channel creation/removal
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current)
    }

    visibilityTimerRef.current = setTimeout(() => {
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return

      // If in cooldown period, don't do anything yet
      if (inCooldownRef.current) {
        console.log(`In cooldown period for service ${serviceId}, skipping channel operations`)
        return
      }

      // If this is the first time or visibility has changed
      if (!isInitializedRef.current || lastVisibleRef.current !== isVisible) {
        console.log(`Visibility changed for service ${serviceId}: ${isVisible}`)
        lastVisibleRef.current = isVisible
        isInitializedRef.current = true

        // Don't set up subscription if component isn't visible
        if (!isVisible) {
          cleanupChannels("visibility-off")
          return
        }

        // If we already have channels, don't recreate them
        if (contentChannelRef.current && voteChannelRef.current) {
          console.log(`Reusing existing channels for service ${serviceId}`)
          return
        }

        // Prevent multiple simultaneous subscription attempts
        if (isSubscribingRef.current) {
          console.log(`Already subscribing to channels for service ${serviceId}, skipping duplicate attempt`)
          return
        }

        // If we've had too many reconnection attempts, back off
        if (reconnectAttemptsRef.current > 5) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 5), 30000) // max 30 seconds
          console.log(
            `Backing off for ${backoffTime}ms before attempting to reconnect channels for service ${serviceId}`,
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) return

            reconnectTimeoutRef.current = null
            // Reset the attempt counter slightly to still maintain some backoff
            reconnectAttemptsRef.current = Math.max(5, reconnectAttemptsRef.current - 1)
            // Force recreation on next render
            lastVisibleRef.current = !isVisible
          }, backoffTime)

          return
        }

        isSubscribingRef.current = true
        setupChannels()
      }
    }, 500) // Increased debounce time to 500ms

    return () => {
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current)
      }
    }
  }, [serviceId, isVisible])

  // Set up the content channel (reviews and replies)
  const setupContentChannel = () => {
    const channelName = `service_${serviceId}_content_${Date.now()}`
    console.log(`Creating content channel: ${channelName}`)

    contentChannelRef.current = supabase
      .channel(channelName)
      // Subscribe to reviews
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_reviews",
          filter: `service_id=eq.${serviceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Review>) => {
          try {
            // For INSERT events, check if we've already processed this ID
            if (payload.eventType === "INSERT" && payload.new && payload.new.id) {
              const id = payload.new.id

              // Skip if we've already processed this ID
              if (processedIdsRef.current.reviews.has(id)) {
                console.log(`Already processed review with ID:`, id)
                return
              }

              // Add to processed set
              processedIdsRef.current.reviews.add(id)
            }

            // Call the callback if provided
            if (callbacks.onReviewChange) {
              callbacks.onReviewChange(payload)
            }
          } catch (error) {
            console.error(`Error processing review update:`, error)
          }
        },
      )
      // Subscribe to replies
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_replies",
          filter: `review_id=in.(select id from service_reviews where service_id=${serviceId})`,
        },
        (payload: RealtimePostgresChangesPayload<Reply>) => {
          try {
            // For INSERT events, check if we've already processed this ID
            if (payload.eventType === "INSERT" && payload.new && payload.new.id) {
              const id = payload.new.id

              // Skip if we've already processed this ID
              if (processedIdsRef.current.replies.has(id)) {
                console.log(`Already processed reply with ID:`, id)
                return
              }

              // Add to processed set
              processedIdsRef.current.replies.add(id)
            }

            // Call the callback if provided
            if (callbacks.onReplyChange) {
              callbacks.onReplyChange(payload)
            }
          } catch (error) {
            console.error(`Error processing reply update:`, error)
          }
        },
      )
      .subscribe(handleSubscriptionStatus("content"))
  }

  // Set up the vote channel
  const setupVoteChannel = () => {
    const channelName = `service_${serviceId}_votes_${Date.now()}`
    console.log(`Creating vote channel: ${channelName}`)

    voteChannelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_votes",
          filter: `review_id=in.(select id from service_reviews where service_id=${serviceId})`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            // For INSERT events, create a unique ID from the payload
            if (payload.eventType === "INSERT" && payload.new) {
              const voteId = `${payload.new.review_id}_${payload.new.user_id}_${payload.new.vote_type}`

              // Skip if we've already processed this vote
              if (processedIdsRef.current.votes.has(voteId)) {
                console.log(`Already processed vote:`, voteId)
                return
              }

              // Add to processed set
              processedIdsRef.current.votes.add(voteId)
            }

            // Call the callback if provided
            if (callbacks.onVoteChange) {
              callbacks.onVoteChange(payload)
            }
          } catch (error) {
            console.error(`Error processing vote update:`, error)
          }
        },
      )
      .subscribe(handleSubscriptionStatus("vote"))
  }

  // Handle subscription status for both channels
  const handleSubscriptionStatus = (channelType: "content" | "vote") => (status: string) => {
    if (!isMountedRef.current) return

    console.log(`Realtime subscription to ${channelType} channel status: ${status}`)

    if (status === "SUBSCRIBED") {
      console.log(`Successfully subscribed to ${channelType} channel`)
      isSubscribingRef.current = false
      reconnectAttemptsRef.current = 0 // Reset on successful subscription

      // Update state to reflect active channels
      if (contentChannelRef.current && voteChannelRef.current) {
        setChannelsActive(true)
      }
    } else if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
      console.log(`${channelType} channel ${status}, will retry`)
      isSubscribingRef.current = false

      if (channelType === "content") {
        contentChannelRef.current = null
      } else {
        voteChannelRef.current = null
      }

      // Update state to reflect inactive channels
      setChannelsActive(false)

      // Increment attempt counter
      reconnectAttemptsRef.current++

      // Enter cooldown period to prevent rapid recreation
      enterCooldown()

      // Wait a bit before retrying
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return

        reconnectTimeoutRef.current = null
        lastVisibleRef.current = !isVisible // Force recreation
      }, 2000) // Increased delay before retry
    }
  }

  // Enter a cooldown period to prevent rapid channel creation/removal cycles
  const enterCooldown = () => {
    inCooldownRef.current = true

    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current)
    }

    cooldownTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return

      inCooldownRef.current = false
      cooldownTimerRef.current = null
      console.log(`Cooldown period ended for service ${serviceId}`)
    }, 3000) // 3 second cooldown
  }

  // Set up both channels
  const setupChannels = () => {
    setupContentChannel()
    setupVoteChannel()
  }

  // Clean up both channels
  const cleanupChannels = (reason = "unknown") => {
    if (contentChannelRef.current) {
      console.log(`Removing content channel for service ${serviceId} (reason: ${reason})`)
      supabase.removeChannel(contentChannelRef.current)
      contentChannelRef.current = null
    }

    if (voteChannelRef.current) {
      console.log(`Removing vote channel for service ${serviceId} (reason: ${reason})`)
      supabase.removeChannel(voteChannelRef.current)
      voteChannelRef.current = null
    }

    // Update state to reflect inactive channels
    if (isMountedRef.current) {
      setChannelsActive(false)
    }
  }

  // Return a method to add IDs to the processed sets
  // This allows components to register IDs they've already handled
  return {
    addProcessedReviewId: (id: number) => {
      processedIdsRef.current.reviews.add(id)
    },
    addProcessedReplyId: (id: number) => {
      processedIdsRef.current.replies.add(id)
    },
    addProcessedVoteId: (reviewId: number, userId: string, voteType: string) => {
      processedIdsRef.current.votes.add(`${reviewId}_${userId}_${voteType}`)
    },
    // Method to check if channels are active
    areChannelsActive: () => {
      return channelsActive
    },
  }
}
