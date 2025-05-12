"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-provider"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { AuthModal } from "@/components/auth/auth-modal"
import { UserAvatar } from "@/components/auth/user-avatar"

export function SiteHeader() {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">StreamSignal</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-4">
            <Link href="/services" className="text-sm font-medium">
              Services
            </Link>
            <Link href="/channels" className="text-sm font-medium">
              Channels
            </Link>
            <Link href="/recommendations" className="text-sm font-medium">
              Recommendations
            </Link>
          </nav>
          <div className="flex items-center space-x-2">
            {user ? (
              <UserAvatar user={user} />
            ) : (
              <Button variant="outline" onClick={() => setShowAuthModal(true)}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  )
}
