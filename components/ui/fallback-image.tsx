"use client"

import { useState } from "react"
import Image, { type ImageProps } from "next/image"

interface FallbackImageProps extends Omit<ImageProps, "onError"> {
  entityName?: string
  fallbackSrc?: string
}

export function FallbackImage({
  src,
  alt,
  entityName,
  fallbackSrc,
  width = 100,
  height = 100,
  ...props
}: FallbackImageProps) {
  const [error, setError] = useState(false)

  // Generate a fallback URL based on the entity name or alt text
  const generateFallbackUrl = () => {
    const name = entityName || alt
    const encodedName = encodeURIComponent(name)
    return fallbackSrc || `/placeholder.svg?height=${height}&width=${width}&query=${encodedName}`
  }

  return (
    <Image
      src={error ? generateFallbackUrl() : src}
      alt={alt}
      width={width}
      height={height}
      onError={() => setError(true)}
      {...props}
    />
  )
}
