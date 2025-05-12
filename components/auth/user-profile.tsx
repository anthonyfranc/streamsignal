"use client"

import { useAuth } from "@/contexts/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/actions/auth-actions"
import { useRouter } from "next/navigation"

export function UserProfile() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  const name = user.user_metadata?.name || user.email?.split("@")[0] || "User"
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} alt={name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
        <Button variant="link" className="p-0 h-auto" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
