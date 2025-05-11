"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

export function AuthTestClient() {
  const { user, session, refreshSession } = useAuth()
  const [serverAuthStatus, setServerAuthStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [voteResult, setVoteResult] = useState<any>(null)

  const checkServerAuth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth-debug")
      const data = await response.json()
      setServerAuthStatus(data)
    } catch (error) {
      console.error("Error checking server auth:", error)
      setServerAuthStatus({ error: "Failed to check server auth" })
    } finally {
      setIsLoading(false)
    }
  }

  const testDirectVote = async () => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("reviewId", "test-review-id")
      formData.append("voteType", "upvote")

      const response = await fetch("/api/test-vote", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      setVoteResult(data)
    } catch (error) {
      console.error("Error testing vote:", error)
      setVoteResult({ error: "Failed to test vote" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Client Auth Status</h3>
          <div className="bg-muted p-3 rounded-md overflow-auto max-h-40">
            <pre className="text-xs">
              {JSON.stringify(
                {
                  authenticated: !!user,
                  userId: user?.id ? `${user.id.substring(0, 8)}...` : null,
                  email: user?.email,
                  sessionExpires: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={checkServerAuth} disabled={isLoading}>
            Check Server Auth
          </Button>
          <Button onClick={refreshSession} disabled={isLoading} variant="outline">
            Refresh Session
          </Button>
          <Button onClick={testDirectVote} disabled={isLoading} variant="secondary">
            Test Direct Vote
          </Button>
        </div>

        {serverAuthStatus && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Server Auth Status</h3>
            <div className="bg-muted p-3 rounded-md overflow-auto max-h-60">
              <pre className="text-xs">{JSON.stringify(serverAuthStatus, null, 2)}</pre>
            </div>
          </div>
        )}

        {voteResult && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Vote Test Result</h3>
            <div className="bg-muted p-3 rounded-md overflow-auto max-h-40">
              <pre className="text-xs">{JSON.stringify(voteResult, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
