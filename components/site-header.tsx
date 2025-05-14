"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

import { MegaMenu } from "@/components/mega-menu"
import { AuthButton, UserMenu } from "@/components/auth/auth-button"
import { supabase } from "@/lib/supabase-client"

// Define the props interface
interface SiteHeaderProps {
  featuredServices?: any[]
  featuredChannels?: any[]
}

export function SiteHeader({ featuredServices = [], featuredChannels = [] }: SiteHeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get the initial user state
    const getInitialUser = async () => {
      setIsLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setIsLoading(false)
    }

    getInitialUser()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
              // Show user menu when logged in
              <UserMenu user={user} />
            ) : (
              // Show login/signup buttons when not logged in
              <>
                <AuthButton />
                <AuthButton defaultTab="signup" />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
