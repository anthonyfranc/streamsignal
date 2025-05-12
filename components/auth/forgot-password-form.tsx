"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { resetPassword } from "@/app/actions/auth-actions"

interface ForgotPasswordFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function ForgotPasswordForm({ onSuccess, onCancel }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const result = await resetPassword(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setMessage(result.message || "Check your email for the password reset link.")
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 py-2">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="your.email@example.com" required />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? "Sending..." : "Reset Password"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
