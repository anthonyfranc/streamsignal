"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { MegaMenu } from "@/components/mega-menu"
import { AuthButton } from "@/components/auth/auth-button"
import { UserAvatar } from "@/components/auth/user-avatar"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// Define the props interface
interface SiteHeaderProps {
  featuredServices?: any[]
  featuredChannels?: any[]
}

export function SiteHeader({ featuredServices = [], featuredChannels = [] }: SiteHeaderProps) {
  const { user, userProfile, isLoading, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  const getUserDisplayName = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name
    }

    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }

    return user?.email?.split("@")[0] || "User"
  }

  // Function to truncate email if too long
  const truncateEmail = (email: string) => {
    if (!email) return ""

    const [username, domain] = email.split("@")

    if (username.length > 10) {
      return `${username.substring(0, 10)}...@${domain}`
    }

    if (email.length > 25) {
      return `${email.substring(0, 22)}...`
    }

    return email
  }

  // Function to truncate display name if too long
  const truncateDisplayName = (name: string) => {
    if (!name) return ""

    if (name.length > 20) {
      return `${name.substring(0, 17)}...`
    }

    return name
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">StreamSignal</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            <MegaMenu featuredServices={featuredServices} featuredChannels={featuredChannels} />
          </nav>
          <div className="flex items-center space-x-2">
            {isLoading ? (
              // Show skeleton loader while checking auth status
              <div className="h-9 w-16 animate-pulse rounded-md bg-muted"></div>
            ) : user ? (
              // Show user dropdown when logged in
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <UserAvatar user={user} profile={userProfile} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate" title={getUserDisplayName()}>
                        {truncateDisplayName(getUserDisplayName())}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate" title={user.email}>
                        {truncateEmail(user.email)}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Show login/signup buttons when not logged in
              <>
                <AuthButton />
                <AuthButton defaultTab="signup" buttonText="Sign up" />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
