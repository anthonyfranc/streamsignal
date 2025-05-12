"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AuthProvider } from "@/contexts/auth-context"
import { SessionMonitor } from "@/components/auth/session-monitor"
import { EnvDebugger } from "@/components/env-debugger"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <AuthProvider>
      <SessionMonitor />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {mounted && <EnvDebugger />}
    </AuthProvider>
  )
}
