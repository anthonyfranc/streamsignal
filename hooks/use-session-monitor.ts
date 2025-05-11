"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

// Time before session expiry when we should refresh (5 minutes)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

// How often to check session status (every minute)
const CHECK_INTERVAL_MS = 60 * 1000

export function useSessionMonitor() {
  const { session, refreshSession, signOut } = useAuth()
  const { toast } = useToast()
  const [isMonitoring, setIsMonitoring] = useState(false)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastOnlineTime: Date.now(),
  })

  // Track user activity
  const updateLastActivity = () => {
    lastActivityRef.current = Date.now()
  }

  // Check if session is about to expire and refresh if needed
  const checkSessionStatus = async () => {
    if (!session) return

    try {
      // Calculate time until expiry
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const timeUntilExpiry = expiresAt - Date.now()

      // If session is about to expire, refresh it
      if (timeUntilExpiry < REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
        console.log(`Session expiring soon (${Math.round(timeUntilExpiry / 1000 / 60)} minutes). Refreshing...`)
        await refreshSession()
        toast({
          title: "Session refreshed",
          description: "Your login session has been refreshed.",
          variant: "default",
        })
      }

      // If session is expired but we still have it in state, sign out
      if (timeUntilExpiry <= 0) {
        console.log("Session expired. Signing out...")
        await signOut()
        toast({
          title: "Session expired",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error checking session status:", error)
    }
  }

  // Handle network status changes
  const handleNetworkChange = () => {
    const isOnline = navigator.onLine
    setNetworkStatus((prev) => ({
      isOnline,
      lastOnlineTime: isOnline ? Date.now() : prev.lastOnlineTime,
    }))

    if (isOnline) {
      // When coming back online, check session immediately
      checkSessionStatus()
    }
  }

  // Handle storage events (for cross-tab synchronization)
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === "supabase.auth.token") {
      // Auth state changed in another tab
      console.log("Auth state changed in another tab. Syncing...")

      // Force refresh the session
      refreshSession()
    }
  }

  // Start monitoring
  const startMonitoring = () => {
    if (isMonitoring) return

    // Set up activity listeners
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"]
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateLastActivity)
    })

    // Set up network listeners
    window.addEventListener("online", handleNetworkChange)
    window.addEventListener("offline", handleNetworkChange)

    // Set up storage event listener for cross-tab sync
    window.addEventListener("storage", handleStorageChange)

    // Initial session check
    checkSessionStatus()

    // Set up interval to check session status
    checkIntervalRef.current = setInterval(() => {
      // Only refresh if there's been activity in the last hour
      const inactiveTime = Date.now() - lastActivityRef.current
      if (inactiveTime < 60 * 60 * 1000) {
        checkSessionStatus()
      }
    }, CHECK_INTERVAL_MS)

    setIsMonitoring(true)
    console.log("Session monitoring started")
  }

  // Stop monitoring
  const stopMonitoring = () => {
    if (!isMonitoring) return

    // Clear timers
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
      checkIntervalRef.current = null
    }

    // Remove event listeners
    const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"]
    activityEvents.forEach((event) => {
      window.removeEventListener(event, updateLastActivity)
    })

    window.removeEventListener("online", handleNetworkChange)
    window.removeEventListener("offline", handleNetworkChange)
    window.removeEventListener("storage", handleStorageChange)

    setIsMonitoring(false)
    console.log("Session monitoring stopped")
  }

  // Start/stop monitoring based on session existence
  useEffect(() => {
    if (session) {
      startMonitoring()
    } else {
      stopMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [session])

  // Force session refresh
  const forceRefresh = async () => {
    try {
      await refreshSession()
      return true
    } catch (error) {
      console.error("Error forcing session refresh:", error)
      return false
    }
  }

  return {
    isMonitoring,
    networkStatus,
    forceRefresh,
    startMonitoring,
    stopMonitoring,
  }
}
