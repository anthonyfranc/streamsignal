import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  user: any
  profile?: any
  size?: "sm" | "md" | "lg"
}

export function UserAvatar({ user, profile, size = "md" }: UserAvatarProps) {
  if (!user) return null

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }

  const avatarClass = sizeClasses[size]

  // Get initials from name or email
  const getName = () => {
    if (profile?.display_name) {
      return profile.display_name
    }

    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }

    return user.email?.split("@")[0] || "User"
  }

  const name = getName()
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Avatar className={avatarClass}>
      <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url} alt={name} />
      <AvatarFallback className="bg-gray-400 text-white">{initials}</AvatarFallback>
    </Avatar>
  )
}
