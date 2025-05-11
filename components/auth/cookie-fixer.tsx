"use client"

import { useEffect, useState } from "react"
import { ensureAuthCookies, checkAuthCookies } from "@/utils/cookie-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function CookieFixer() {
  const [status, setStatus] = useState<"checking" | "fixed" | "fixing" | "error" | "not-needed">("checking")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAndFixCookies = async () => {
      try {
        // Check if cookies need fixing
        const cookieStatus = checkAuthCookies()

        if (!cookieStatus.hasAuthCookies) {
          setStatus("fixing")
          const success = await ensureAuthCookies()
          setStatus(success ? "fixed" : "error")
          if (!success) {
            setError("Failed to fix authentication cookies")
          }
        } else {
          setStatus("not-needed")
        }
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Unknown error")
      }
    }

    checkAndFixCookies()
  }, [])

  const retryFix = async () => {
    setStatus("fixing")
    try {
      const success = await ensureAuthCookies()
      setStatus(success ? "fixed" : "error")
      if (!success) {
        setError("Failed to fix authentication cookies")
      }
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  if (status === "not-needed") {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert className={status === "error" ? "bg-red-50" : status === "fixed" ? "bg-green-50" : "bg-blue-50"}>
        <AlertDescription>
          {status === "checking" && "Checking authentication cookies..."}
          {status === "fixing" && "Fixing authentication cookies..."}
          {status === "fixed" && "Authentication cookies fixed successfully!"}
          {status === "error" && (
            <div>
              <p>Error fixing authentication cookies: {error}</p>
              <Button size="sm" onClick={retryFix} className="mt-2">
                Retry
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
