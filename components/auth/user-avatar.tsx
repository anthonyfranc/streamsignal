"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { LogOut, User } from "lucide-react"

interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  review_count: number
}

export function UserAvatar() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserProfile(user.id)
    } else {
      setProfile(null)
      setIsLoading(false)
    }
  }, [user])

  const fetchUserProfile = async (userId: string) => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, display_name, avatar_url, review_count")
        .eq("id", userId)
        .single()

      if (error) {
        // Handle the case where the table doesn't exist yet or other errors
        console.error("Error fetching user profile:", error.message)
        // Create a default profile object based on the user's email
        if (user) {
          setProfile({
            id: user.id,
            display_name: user.email?.split("@")[0] || "User",
            avatar_url: null,
            review_count: 0,
          })
        }
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error("Exception fetching user profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={displayName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
