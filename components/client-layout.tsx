"use client"

import type React from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AuthProvider } from "@/contexts/auth-context"

interface ClientLayoutProps {
  children: React.ReactNode
  featuredServices?: any[]
  featuredChannels?: any[]
}

export function ClientLayout({ children, featuredServices = [], featuredChannels = [] }: ClientLayoutProps) {
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
