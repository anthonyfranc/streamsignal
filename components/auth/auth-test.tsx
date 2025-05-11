"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export function AuthTest() {
  const { user, session, refreshSession } = useAuth()
  const [serverResponse, setServerResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [directAuthResult, setDirectAuthResult] = useState<any>(null)

  // Test server-side authentication
  const testServerAuth = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth-debug")
      const data = await response.json()
      setServerResponse(data)
    } catch (error) {
      console.error("Error testing server auth:", error)
      setServerResponse({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsLoading(false)
    }
  }

  // Test direct authentication with Supabase
  const testDirectAuth = async () => {
    try {
      setIsLoading(true)

      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser()

      // Get session data
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      setDirectAuthResult({
        user: userData.user
          ? {
              id: userData.user.id.substring(0, 8) + "...",
              email: userData.user.email,
              hasMetadata: !!userData.user.user_metadata,
            }
          : null,
        session: sessionData.session
          ? {
              expires_at: new Date(sessionData.session.expires_at! * 1000).toISOString(),
              token: sessionData.session.access_token.substring(0, 5) + "...",
            }
          : null,
        userError: userError?.message,
        sessionError: sessionError?.message,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error testing direct auth:", error)
      setDirectAuthResult({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
        <CardDescription>Test client and server authentication</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-md bg-muted">
          <h3 className="font-medium mb-2">Client Auth State:</h3>
          <pre className="text-xs overflow-auto p-2 bg-background rounded">
            {JSON.stringify(
              {
                authenticated: !!user,
                user: user
                  ? {
                      id: user.id.substring(0, 8) + "...",
                      email: user.email,
                      hasMetadata: !!user.user_metadata,
                    }
                  : null,
                session: session
                  ? {
                      expires_at: new Date(session.expires_at! * 1000).toISOString(),
                      token: session.access_token.substring(0, 5) + "...",
                    }
                  : null,
              },
              null,
              2,
            )}
          </pre>
        </div>

        {directAuthResult && (
          <div className="p-4 border rounded-md bg-muted">
            <h3 className="font-medium mb-2">Direct Auth Check:</h3>
            <pre className="text-xs overflow-auto p-2 bg-background rounded">
              {JSON.stringify(directAuthResult, null, 2)}
            </pre>
          </div>
        )}

        {serverResponse && (
          <div className="p-4 border rounded-md bg-muted">
            <h3 className="font-medium mb-2">Server Auth Response:</h3>
            <pre className="text-xs overflow-auto p-2 bg-background rounded">
              {JSON.stringify(serverResponse, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={testDirectAuth} disabled={isLoading} variant="outline">
          Test Direct Auth
        </Button>
        <Button onClick={testServerAuth} disabled={isLoading}>
          Test Server Auth
        </Button>
        <Button onClick={refreshSession} disabled={isLoading} variant="secondary">
          Refresh Session
        </Button>
      </CardFooter>
    </Card>
  )
}
