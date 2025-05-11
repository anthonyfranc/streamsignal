"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export function AuthDebugger() {
  const { user, session, refreshSession } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [sessionDetails, setSessionDetails] = useState<any>(null)
  const [cookieDetails, setCookieDetails] = useState<string[]>([])
  const [testResult, setTestResult] = useState<string | null>(null)

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
        setTestResult(`✅ Authentication successful! User ID: ${result.userId}`)
      } else {
        setTestResult(`❌ Authentication failed: ${result.message}`)
      }
    } catch (error) {
      setTestResult(`❌ Error testing authentication: ${error instanceof Error ? error.message : String(error)}`)
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
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card>
        <CardHeader>
          <CardTitle>Auth Debugger</CardTitle>
          <CardDescription>Troubleshoot authentication issues</CardDescription>
        </CardHeader>
        <CardContent className="max-h-96 overflow-auto text-xs">
          <div className="space-y-4">
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

            <div>
              <Button size="sm" onClick={handleTestAuth}>
                Test Authentication
              </Button>
              {testResult && <pre className="bg-gray-100 p-2 rounded overflow-auto mt-2">{testResult}</pre>}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshSession} className="ml-2">
            Refresh Session
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
