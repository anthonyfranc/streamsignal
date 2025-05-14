"use client"

import type React from "react"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AuthProvider } from "@/contexts/auth-context"
import { useAuthCleanup } from "@/utils/auth-cleanup"

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [featuredServices, setFeaturedServices] = useState([])
  const [featuredChannels, setFeaturedChannels] = useState([])

  // Run auth cleanup once
  useAuthCleanup()

  return (
    <AuthProvider>
      <div className="relative flex min-h-screen flex-col">
        <SiteHeader featuredServices={featuredServices} featuredChannels={featuredChannels} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </AuthProvider>
  )
}
