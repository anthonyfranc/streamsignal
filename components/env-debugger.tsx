"use client"

import { useEffect, useState } from "react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function EnvDebugger() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [showDebugger, setShowDebugger] = useState(false)

  useEffect(() => {
    // Collect all NEXT_PUBLIC environment variables
    const publicEnvVars: Record<string, string> = {}

    // @ts-ignore - process.env is a special object in Next.js
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("NEXT_PUBLIC_")) {
        // @ts-ignore - process.env is a special object in Next.js
        const value = process.env[key]
        publicEnvVars[key] = value ? `${value.substring(0, 3)}...${value.substring(value.length - 3)}` : "undefined"
      }
    })

    setEnvVars(publicEnvVars)

    // Check for specific Supabase variables
    const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const hasSupabaseKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      console.error("Missing critical Supabase environment variables:")
      console.error(`NEXT_PUBLIC_SUPABASE_URL: ${hasSupabaseUrl ? "present" : "missing"}`)
      console.error(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasSupabaseKey ? "present" : "missing"}`)
      setShowDebugger(true)
    }
  }, [])

  if (!showDebugger) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button variant="outline" size="sm" onClick={() => setShowDebugger((prev) => !prev)}>
        Debug Environment
      </Button>

      {showDebugger && (
        <Alert className="mt-2 w-[300px] bg-white shadow-lg">
          <AlertTitle>Environment Variables</AlertTitle>
          <AlertDescription>
            <div className="text-xs mt-2 max-h-[200px] overflow-auto">
              {Object.keys(envVars).length === 0 ? (
                <p>No NEXT_PUBLIC environment variables found</p>
              ) : (
                <ul className="space-y-1">
                  {Object.entries(envVars).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
