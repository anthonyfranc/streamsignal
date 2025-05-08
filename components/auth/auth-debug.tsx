"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { checkAuthStatus } from "@/app/actions/auth-debug-actions"

export function AuthDebugPanel() {
  const { user, session } = useAuth()
  const [serverAuthStatus, setServerAuthStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkServerAuth = async () => {
    setIsLoading(true)
    try {
      const status = await checkAuthStatus()
      setServerAuthStatus(status)
    } catch (error) {
      console.error("Error checking auth status:", error)
      setServerAuthStatus({ error: "Failed to check server auth status" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Authentication Debug</CardTitle>
        <CardDescription>Diagnose authentication issues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Client Auth Status:</h3>
            <div className="bg-white p-3 rounded border text-sm overflow-auto max-h-40">
              <pre>{JSON.stringify({ user: user ? { id: user.id, email: user.email } : null }, null, 2)}</pre>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={checkServerAuth} disabled={isLoading}>
              {isLoading ? "Checking..." : "Check Server Auth"}
            </Button>
          </div>

          {serverAuthStatus && (
            <div>
              <h3 className="font-medium mb-2">Server Auth Status:</h3>
              <div className="bg-white p-3 rounded border text-sm overflow-auto max-h-40">
                <pre>{JSON.stringify(serverAuthStatus, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
