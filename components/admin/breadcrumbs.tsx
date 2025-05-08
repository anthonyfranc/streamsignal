"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
  const pathname = usePathname()

  if (!pathname || pathname === "/admin") {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Home className="mr-2 h-4 w-4" />
        <span className="font-medium text-foreground">Dashboard</span>
      </div>
    )
  }

  const segments = pathname.split("/").filter(Boolean).slice(1) // Remove "admin" from the path

  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <Link href="/admin" className="flex items-center hover:text-foreground">
        <Home className="mr-2 h-4 w-4" />
        <span>Dashboard</span>
      </Link>

      {segments.map((segment, index) => {
        // Build the path up to this segment
        const path = `/admin/${segments.slice(0, index + 1).join("/")}`

        // Format the segment for display (capitalize, replace hyphens)
        const formattedSegment = segment.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())

        // Check if this is the last segment
        const isLast = index === segments.length - 1

        // If it's a numeric ID, try to make it more descriptive
        const isId = !isNaN(Number(segment))

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="mx-1 h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">{isId ? "Details" : formattedSegment}</span>
            ) : (
              <Link href={path} className="hover:text-foreground">
                {formattedSegment}
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
