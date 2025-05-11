"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react"

export function SessionExpiryWarning() {
  const { isSessionExpiring, sessionExpiry, refreshSession, isRefreshingSession } = useAuth()
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  useEffect(() => {
    if (!isSessionExpiring || !sessionExpiry) return

    const updateTimeRemaining = () => {
      const now = Date.now()
      const remaining = Math.max(0, sessionExpiry - now)

      // Format as minutes:seconds
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`)
    }

    // Update immediately
    updateTimeRemaining()

    // Then update every second
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [isSessionExpiring, sessionExpiry])

  const handleRefresh = async () => {
    try {
      await refreshSession()
      toast({
        title: "Session refreshed",
        description: "Your session has been successfully extended.",
      })
    } catch (error) {
      toast({
        title: "Failed to refresh session",
        description: "Please try logging in again.",
        variant: "destructive",
      })
    }
  }

  if (!isSessionExpiring) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-900">Your session is expiring soon</h4>
          <p className="text-sm text-amber-700 mt-1">
            Your login session will expire in {timeRemaining}. Would you like to stay logged in?
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleRefresh} disabled={isRefreshingSession}>
              {isRefreshingSession ? "Refreshing..." : "Stay logged in"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
