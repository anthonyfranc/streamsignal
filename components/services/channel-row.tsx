import type { Channel } from "@/types/streaming"
import { FallbackImage } from "@/components/ui/fallback-image"

interface ChannelRowProps {
  channels: Channel[]
  loading: boolean
  maxDisplay: number
  variant?: "compact" | "standard"
  layout?: "grid" | "row" | "row-limited"
  showEmptyState?: boolean
}

export function ChannelRow({
  channels,
  loading,
  maxDisplay,
  variant = "standard",
  layout = "row-limited",
  showEmptyState = false,
}: ChannelRowProps) {
  // Adjust sizes based on variant
  const logoSize = variant === "compact" ? "h-8 w-8" : "h-10 w-10"
  const textSize = variant === "compact" ? "text-[10px]" : "text-xs"
  const itemWidth = variant === "compact" ? "min-w-[40px] max-w-[50px]" : "min-w-[50px] max-w-[60px]"

  // Display skeleton loaders when loading
  if (loading) {
    if (layout === "grid") {
      // 2-column grid layout for loading state
      return (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: maxDisplay }).map((_, index) => (
            <div key={index} className="flex items-center gap-2 animate-pulse">
              <div className={`${logoSize} rounded-full bg-gray-100 shrink-0`}></div>
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      )
    }

    // Row layout for loading state (both row and row-limited)
    return (
      <div className="flex space-x-4">
        {Array.from({ length: maxDisplay }).map((_, index) => (
          <div key={index} className={`flex flex-col items-center ${itemWidth} animate-pulse`}>
            <div className={`${logoSize} rounded-full bg-gray-100`}></div>
            <div className="h-3 w-full bg-gray-100 rounded mt-2"></div>
          </div>
        ))}
      </div>
    )
  }

  // If no channels and we don't want to show empty state, return null
  if (channels.length === 0) {
    if (!showEmptyState) {
      return null
    }
    return <div className="text-sm text-gray-500">No channels available</div>
  }

  const displayChannels = channels.slice(0, maxDisplay)
  const remainingChannels = channels.length > maxDisplay ? channels.length - maxDisplay : 0

  // 2-column grid layout
  if (layout === "grid") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {displayChannels.map((channel) => (
          <div key={channel.id} className="flex items-center gap-2">
            <div
              className={`${logoSize} rounded-full bg-gray-100 flex items-center justify-center overflow-hidden relative shrink-0 border border-gray-200`}
            >
              {channel.logo_url ? (
                <FallbackImage
                  src={channel.logo_url}
                  alt={channel.name}
                  fill
                  sizes={variant === "compact" ? "32px" : "40px"}
                  className="object-cover"
                  loading="lazy"
                  unoptimized={true}
                  entityName={channel.name}
                />
              ) : (
                <span className={`font-bold ${textSize}`}>{channel.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className={`${textSize} truncate`} title={channel.name}>
              {channel.name}
            </span>
          </div>
        ))}

        {remainingChannels > 0 && (
          <div className="flex items-center gap-2">
            <div
              className={`${logoSize} rounded-full bg-gray-100 flex items-center justify-center text-gray-600 border border-gray-200 shrink-0`}
            >
              <span className={textSize}>+{remainingChannels}</span>
            </div>
            <span className={`${textSize} text-gray-500`}>more</span>
          </div>
        )}
      </div>
    )
  }

  // Row layout (horizontal) - both row and row-limited use the same component structure
  // but row-limited will have a smaller maxDisplay value
  return (
    <div className="flex space-x-4">
      {displayChannels.map((channel) => (
        <div key={channel.id} className={`flex flex-col items-center ${itemWidth}`}>
          <div
            className={`${logoSize} rounded-full bg-gray-100 flex items-center justify-center overflow-hidden relative shrink-0 border border-gray-200`}
          >
            {channel.logo_url ? (
              <FallbackImage
                src={channel.logo_url}
                alt={channel.name}
                fill
                sizes={variant === "compact" ? "32px" : "40px"}
                className="object-cover"
                loading="lazy"
                unoptimized={true}
                entityName={channel.name}
              />
            ) : (
              <span className={`font-bold ${textSize}`}>{channel.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <span className={`${textSize} text-center mt-1.5 w-full truncate`} title={channel.name}>
            {channel.name}
          </span>
        </div>
      ))}

      {remainingChannels > 0 && (
        <div className={`flex flex-col items-center justify-center ${itemWidth}`}>
          <div
            className={`${logoSize} rounded-full bg-gray-100 flex items-center justify-center text-gray-600 border border-gray-200`}
          >
            <span className={textSize}>+{remainingChannels}</span>
          </div>
          <span className={`${textSize} text-center mt-1.5 text-gray-500`}>more</span>
        </div>
      )}
    </div>
  )
}
