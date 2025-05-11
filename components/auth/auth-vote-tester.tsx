"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { submitVote } from "@/app/actions/vote-actions"

export function AuthVoteTester() {
  const [result, setResult] = useState<any>(null)
  const [apiResult, setApiResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isApiLoading, setIsApiLoading] = useState(false)

  const testVote = async () => {
    setIsLoading(true)
    try {
      // Create a FormData object with test data
      const formData = new FormData()
      formData.append("reviewId", "1") // Use a valid review ID
      formData.append("voteType", "like")
      formData.append("serviceId", "1") // Use a valid service ID

      // Call the submitVote server action
      const result = await submitVote(formData)
      setResult(result)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        error: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testAuthApi = async (action: string) => {
    setIsApiLoading(true)
    try {
      // Call the auth-debug API
      const response = await fetch("/api/auth-debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()
      setApiResult(data)
    } catch (error) {
      setApiResult({
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsApiLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Authentication & Vote Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button onClick={testVote} disabled={isLoading}>
              {isLoading ? "Testing..." : "Test Vote Action"}
            </Button>
            <Button onClick={() => testAuthApi("test-db-access")} disabled={isApiLoading} variant="outline">
              {isApiLoading ? "Testing..." : "Test DB Access"}
            </Button>
            <Button onClick={() => testAuthApi("test-vote")} disabled={isApiLoading} variant="outline">
              {isApiLoading ? "Testing..." : "Test Direct Vote"}
            </Button>
          </div>

          {result && (
            <Alert className={result.success ? "bg-green-50" : "bg-red-50"}>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(result, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}

          {apiResult && (
            <Alert className="bg-blue-50 mt-4">
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(apiResult, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
