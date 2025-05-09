"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PersistentTabsProps {
  defaultValue: string
  className?: string
  showContentTab: boolean
  contentTabLabel: string
  children: React.ReactNode
}

export function PersistentTabs({
  defaultValue,
  className,
  showContentTab,
  contentTabLabel,
  children,
}: PersistentTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || defaultValue)

  // Update the URL when the tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)

    // Create a new URLSearchParams object
    const params = new URLSearchParams(searchParams.toString())

    // Set the tab parameter
    params.set("tab", value)

    // Update the URL without refreshing the page
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Initialize the tab from URL on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className={className}>
      <TabsList className={`grid w-full ${showContentTab ? "grid-cols-4" : "grid-cols-3"}`}>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {showContentTab && <TabsTrigger value="content">{contentTabLabel}</TabsTrigger>}
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}
