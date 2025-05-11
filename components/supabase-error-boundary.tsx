"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function SupabaseErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if the required environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
    } else if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
    }
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Supabase Configuration Error</AlertTitle>
          <AlertDescription>
            <p className="mb-4">{error}</p>
            <p className="mb-4">Please make sure all required environment variables are set in your Vercel project.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}
