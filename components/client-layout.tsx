"use client"

import type React from "react"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useIsAdminRoute, useIsLoginPage } from "@/utils/route-utils"
import { useEffect, useState } from "react"
import { getFeaturedServices } from "@/app/actions/service-actions"
import { getFeaturedChannels } from "@/app/actions/channel-actions"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { SessionMonitor } from "@/components/auth/session-monitor"
import { SessionExpiryWarning } from "@/components/auth/session-expiry-warning"
import { AuthDebugger } from "@/components/auth/auth-debugger"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const isAdminRoute = useIsAdminRoute()
  const isLoginPage = useIsLoginPage()
  const [featuredServices, setFeaturedServices] = useState([])
  const [featuredChannels, setFeaturedChannels] = useState([])

  // Fetch data for the header only if we're on a non-admin route
  useEffect(() => {
    if (!isAdminRoute) {
      const fetchData = async () => {
        try {
          const services = await getFeaturedServices(3)
          setFeaturedServices(services)
        } catch (error) {
          console.error("Error fetching featured services:", error)
        }

        try {
          const channels = await getFeaturedChannels(3)
          setFeaturedChannels(channels)
        } catch (error) {
          console.error("Error fetching featured channels:", error)
        }
      }

      fetchData()
    }
  }, [isAdminRoute])

  // If we're on an admin route (except login), just render the children
  if (isAdminRoute && !isLoginPage) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <SessionMonitor />
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
  }

  // For login page, use a minimal layout
  if (isLoginPage) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <SessionMonitor />
          <div className="relative flex min-h-screen flex-col">{children}</div>
        </AuthProvider>
      </ThemeProvider>
    )
  }

  // For non-admin routes, include the header and footer
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <SessionMonitor />
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader featuredServices={featuredServices} featuredChannels={featuredChannels} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          {process.env.NODE_ENV !== "production" && <AuthDebugger />}
        </div>
        <SessionExpiryWarning />
      </AuthProvider>
    </ThemeProvider>
  )
}
