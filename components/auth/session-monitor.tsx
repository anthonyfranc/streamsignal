"use client"

import { useEffect } from "react"
import { useSessionMonitor } from "@/hooks/use-session-monitor"
import { useAuth } from "@/contexts/auth-context"

export function SessionMonitor() {
  const { isMonitoring, networkStatus } = useSessionMonitor()
  const { user } = useAuth()

  // Log important state changes for debugging
  useEffect(() => {
    if (user) {
      console.log("SessionMonitor: User authenticated", {
        userId: user.id,
        isMonitoring,
        networkStatus,
      })
    } else {
      console.log("SessionMonitor: No authenticated user")
    }
  }, [user, isMonitoring, networkStatus])

  // This component doesn't render anything visible
  return null
}
