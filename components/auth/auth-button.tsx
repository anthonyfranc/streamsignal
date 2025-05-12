"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-provider"
import { signOut } from "@/app/actions/auth-actions"
import { useRouter } from "next/navigation"

interface AuthButtonProps {
  onSignInClick?: () => void
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
}

export function AuthButton({ onSignInClick, variant = "default" }: AuthButtonProps) {
  const { user } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  return user ? (
    <Button onClick={handleSignOut} variant={variant}>
      Sign Out
    </Button>
  ) : (
    <Button onClick={onSignInClick} variant={variant}>
      Sign In
    </Button>
  )
}
