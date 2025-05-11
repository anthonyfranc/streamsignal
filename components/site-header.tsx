"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MegaMenu } from "@/components/mega-menu"
import { UserAvatar } from "@/components/auth/user-avatar"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { AuthModal } from "@/components/auth/auth-modal"

export function SiteHeader() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Don't show header on admin pages
  if (pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">StreamSignal</span>
        </Link>
        <MegaMenu />
        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <UserAvatar />
          ) : (
            <Button variant="outline" onClick={() => setAuthModalOpen(true)}>
              Sign In
            </Button>
          )}
          <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </div>
      </div>
    </header>
  )
}
