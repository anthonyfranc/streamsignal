import { Check } from "lucide-react"

interface KeyFeaturesProps {
  features?: string[]
  variant?: "compact" | "standard"
  maxFeatures?: number
}

export function KeyFeatures({ features, variant = "standard", maxFeatures = 3 }: KeyFeaturesProps) {
  // If no features are provided, return null
  if (!features || features.length === 0) {
    return null
  }

  const displayFeatures = features.slice(0, maxFeatures)
  const iconSize = variant === "compact" ? 16 : 18
  const textClass = `text-sm ${variant === "compact" ? "text-xs" : ""}`

  return (
    <div className="space-y-1">
      {displayFeatures.map((feature, index) => (
        <div key={index} className="flex items-start">
          <Check size={iconSize} className="text-green-500 mr-2 mt-0.5 shrink-0" />
          <span className={textClass}>{feature}</span>
        </div>
      ))}
    </div>
  )
}
