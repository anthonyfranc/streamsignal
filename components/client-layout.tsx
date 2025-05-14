"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AuthProvider } from "@/contexts/auth-context"
import { getFeaturedServices } from "@/app/actions/service-actions"
import { getFeaturedChannels } from "@/app/actions/channel-actions"
import { useAuthDebug } from "@/utils/auth-debug"

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [featuredServices, setFeaturedServices] = useState([])
  const [featuredChannels, setFeaturedChannels] = useState([])

  // Add auth debugging
  useAuthDebug()

  useEffect(() => {
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
  }, [])

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
