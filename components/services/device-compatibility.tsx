import { Laptop, Smartphone, Tv, Gamepad2, Cast } from "lucide-react"
import type { DeviceCompatibility as DeviceCompatibilityType } from "@/types/streaming"

interface DeviceCompatibilityProps {
  compatibility?: DeviceCompatibilityType
  variant?: "compact" | "standard"
}

export function DeviceCompatibility({ compatibility, variant = "standard" }: DeviceCompatibilityProps) {
  // If no compatibility data is provided, show default (all supported)
  const devices = compatibility || {
    smart_tv: true,
    mobile: true,
    web: true,
    gaming_console: true,
    streaming_device: true,
  }

  const iconSize = variant === "compact" ? 16 : 20
  const iconClass = `${variant === "compact" ? "mr-1" : "mr-2"} text-gray-600`
  const labelClass = `text-sm ${variant === "compact" ? "text-xs" : ""}`

  return (
    <div className="flex flex-wrap gap-2">
      {devices.smart_tv && (
        <div className="flex items-center" title="Smart TVs">
          <Tv size={iconSize} className={iconClass} />
          <span className={labelClass}>TV</span>
        </div>
      )}
      {devices.mobile && (
        <div className="flex items-center" title="Mobile Devices">
          <Smartphone size={iconSize} className={iconClass} />
          <span className={labelClass}>Mobile</span>
        </div>
      )}
      {devices.web && (
        <div className="flex items-center" title="Web Browsers">
          <Laptop size={iconSize} className={iconClass} />
          <span className={labelClass}>Web</span>
        </div>
      )}
      {devices.gaming_console && (
        <div className="flex items-center" title="Gaming Consoles">
          <Gamepad2 size={iconSize} className={iconClass} />
          <span className={labelClass}>Console</span>
        </div>
      )}
      {devices.streaming_device && (
        <div className="flex items-center" title="Streaming Devices (Roku, Fire TV, etc.)">
          <Cast size={iconSize} className={iconClass} />
          <span className={labelClass}>Devices</span>
        </div>
      )}
    </div>
  )
}
