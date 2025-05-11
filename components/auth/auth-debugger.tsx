"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AuthDebugger() {
  const { user, session, refreshSession } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [sessionDetails, setSessionDetails] = useState<any>(null)
  const [cookieDetails, setCookieDetails] = useState<string[]>([])
  const [testResult, setTestResult] = useState<string | null>(null)
  const [directVoteTest, setDirectVoteTest] = useState<string | null>(null)
  const [serverAuthDebug, setServerAuthDebug] = useState<any>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Get session details
      const getSessionDetails = async () => {
        const { data } = await supabase.auth.getSession()
        setSessionDetails(data.session)
      }

      // Get cookie details
      const getCookieDetails = () => {
        const cookies = document.cookie.split(";").map((cookie) => cookie.trim())
        setCookieDetails(cookies)
      }

      getSessionDetails()
      getCookieDetails()
    }
  }, [isOpen])

  const handleTestAuth = async () => {
    try {
      setIsLoading(true)
      setTestResult("Testing authentication...")

      // First refresh the session
      await refreshSession()

      // Create a test form
      const formData = new FormData()
      formData.append("test", "true")

      // Make a fetch request to a test endpoint
      const response = await fetch("/api/auth-test", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const result = await response.json()

      if (result.authenticated) {
        setTestResult(`✅ Authentication successful! User ID: ${result.userId}
Debug info:
- Session exists: ${result.debug.sessionExists}
- Cookies count: ${result.debug.cookiesCount}
- Cookie names: ${result.debug.cookieNames.join(", ")}`)
      } else {
        setTestResult(`❌ Authentication failed: ${result.message}
Debug info:
- Session exists: ${result.debug?.sessionExists}
- Cookies count: ${result.debug?.cookiesCount}
- Cookie names: ${result.debug?.cookieNames?.join(", ")}`)
      }
    } catch (error) {
      setTestResult(`❌ Error testing authentication: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestDirectVote = async () => {
    try {
      setIsLoading(true)
      setDirectVoteTest("Testing direct vote submission...")

      // First refresh the session
      await refreshSession()

      // Create a test form for a dummy vote
      const formData = new FormData()
      formData.append("reviewId", "1") // Use a dummy review ID
      formData.append("voteType", "like")
      formData.append("serviceId", "1")

      // Import the submitVote function dynamically
      const { submitVote } = await import("@/app/actions/vote-actions")

      // Call the function directly
      const result = await submitVote(formData)

      setDirectVoteTest(`Vote test result: ${result.success ? "✅ Success" : "❌ Failed"}
Message: ${result.message}
Requires auth: ${result.requireAuth ? "Yes" : "No"}
Debug: ${JSON.stringify(result.debug, null, 2)}`)
    } catch (error) {
      setDirectVoteTest(`❌ Error testing direct vote: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestAuthDebug = async () => {
    try {
      setIsLoading(true)
      setServerAuthDebug("Loading server authentication details...")

      // First refresh the session
      await refreshSession()

      // Make a fetch request to the debug endpoint
      const response = await fetch("/api/auth-debug", {
        method: "GET",
        credentials: "include",
      })

      const result = await response.json()
      setServerAuthDebug(result)
    } catch (error) {
      setServerAuthDebug({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncAuth = async () => {
    try {
      setIsLoading(true)
      setSyncResult("Syncing authentication with server...")

      // First refresh the session
      await refreshSession()

      // Make a fetch request to the sync endpoint
      const response = await fetch("/api/auth-sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "SYNC" }),
      })

      const result = await response.json()

      if (result.success) {
        setSyncResult(`✅ Auth sync successful!
- Session exists: ${result.sessionExists}
- Cookies count: ${result.cookiesCount}
- Cookie names: ${result.cookieNames.join(", ")}`)

        // Refresh cookie details
        const cookies = document.cookie.split(";").map((cookie) => cookie.trim())
        setCookieDetails(cookies)
      } else {
        setSyncResult(`❌ Auth sync failed: ${result.message}`)
      }
    } catch (error) {
      setSyncResult(`❌ Error syncing authentication: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Auth Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[500px]">
      <Card>
        <CardHeader>
          <CardTitle>Auth Debugger</CardTitle>
          <CardDescription>Troubleshoot authentication issues</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-auto text-xs">
          <Tabs defaultValue="client">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="client">Client Auth</TabsTrigger>
              <TabsTrigger value="server">Server Auth</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="sync">Sync</TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">User</h3>
                <pre className="bg-gray-100 p-2 rounded overflow-auto">
                  {user ? JSON.stringify(user, null, 2) : "Not authenticated"}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-1">Session</h3>
                <pre className="bg-gray-100 p-2 rounded overflow-auto">
                  {sessionDetails
                    ? JSON.stringify(
                        {
                          expires_at: sessionDetails.expires_at,
                          token_type: sessionDetails.token_type,
                          access_token: sessionDetails.access_token
                            ? `${sessionDetails.access_token.substring(0, 10)}...`
                            : null,
                          refresh_token: sessionDetails.refresh_token
                            ? `${sessionDetails.refresh_token.substring(0, 10)}...`
                            : null,
                        },
                        null,
                        2,
                      )
                    : "No session"}
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-1">Cookies</h3>
                <pre className="bg-gray-100 p-2 rounded overflow-auto">
                  {cookieDetails.length > 0 ? cookieDetails.join("\n") : "No cookies"}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="server" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Server Auth Details</h3>
                <Button size="sm" onClick={handleTestAuthDebug} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Refresh"}
                </Button>
              </div>

              {serverAuthDebug && typeof serverAuthDebug === "object" ? (
                <pre className="bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(serverAuthDebug, null, 2)}</pre>
              ) : (
                <pre className="bg-gray-100 p-2 rounded overflow-auto">
                  {serverAuthDebug || "Click Refresh to load server auth details"}
                </pre>
              )}
            </TabsContent>

            <TabsContent value="tests" className="space-y-4">
              <div className="space-y-2">
                <Button size="sm" onClick={handleTestAuth} disabled={isLoading}>
                  {isLoading ? "Testing..." : "Test API Auth"}
                </Button>
                {testResult && <pre className="bg-gray-100 p-2 rounded overflow-auto mt-2">{testResult}</pre>}
              </div>

              <div className="space-y-2">
                <Button size="sm" onClick={handleTestDirectVote} disabled={isLoading}>
                  {isLoading ? "Testing..." : "Test Direct Vote"}
                </Button>
                {directVoteTest && <pre className="bg-gray-100 p-2 rounded overflow-auto mt-2">{directVoteTest}</pre>}
              </div>
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  If your client and server authentication are out of sync, use this button to force a synchronization.
                </p>
                <Button size="sm" onClick={handleSyncAuth} disabled={isLoading}>
                  {isLoading ? "Syncing..." : "Sync Auth with Server"}
                </Button>
                {syncResult && <pre className="bg-gray-100 p-2 rounded overflow-auto mt-2">{syncResult}</pre>}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshSession} className="ml-2" disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh Session"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
