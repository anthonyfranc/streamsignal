"use client"

import { FallbackImage } from "@/components/ui/fallback-image"
import { useState } from "react"

interface ChannelLogoProps {
  logoUrl: string | null
  name: string
  size?: "sm" | "md" | "lg"
}

export function ChannelLogo({ logoUrl, name, size = "md" }: ChannelLogoProps) {
  const [hasError, setHasError] = useState(false)

  // Size mappings
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-sm",
  }

  // If no logo or error loading, show initials
  if (!logoUrl || hasError) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center text-gray-800 font-bold border border-gray-200`}
      >
        {name.substring(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative border border-gray-200 bg-white`}>
      <FallbackImage
        src={logoUrl}
        alt={name}
        fill
        sizes={size === "sm" ? "24px" : size === "md" ? "40px" : "64px"}
        className="object-cover" // Use cover to fill the space
        loading="lazy"
        unoptimized={true}
        entityName={name}
        onError={() => setHasError(true)}
      />
    </div>
  )
}
