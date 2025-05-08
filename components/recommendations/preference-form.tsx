"use client"

import { Slider } from "@/components/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

interface PreferenceFormProps {
  priceImportance: number
  setPriceImportance: (value: number) => void
  channelCoverageImportance: number
  setChannelCoverageImportance: (value: number) => void
  additionalFeaturesImportance: number
  setAdditionalFeaturesImportance: (value: number) => void
}

export function PreferenceForm({
  priceImportance,
  setPriceImportance,
  channelCoverageImportance,
  setChannelCoverageImportance,
  additionalFeaturesImportance,
  setAdditionalFeaturesImportance,
}: PreferenceFormProps) {
  return (
    <Collapsible className="w-full border rounded-lg p-4">
      <CollapsibleTrigger className="flex w-full items-center justify-between">
        <h3 className="text-lg font-medium">Recommendation Preferences</h3>
        <ChevronDown className="h-5 w-5" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="price-importance" className="text-sm font-medium">
              Price Importance
            </label>
            <span className="text-sm text-muted-foreground">{priceImportance}/10</span>
          </div>
          <Slider
            id="price-importance"
            min={1}
            max={10}
            step={1}
            value={[priceImportance]}
            onValueChange={(value) => setPriceImportance(value[0])}
          />
          <p className="text-xs text-muted-foreground">
            How important is price in your decision? Higher values prioritize cheaper services.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="channel-coverage-importance" className="text-sm font-medium">
              Channel Coverage Importance
            </label>
            <span className="text-sm text-muted-foreground">{channelCoverageImportance}/10</span>
          </div>
          <Slider
            id="channel-coverage-importance"
            min={1}
            max={10}
            step={1}
            value={[channelCoverageImportance]}
            onValueChange={(value) => setChannelCoverageImportance(value[0])}
          />
          <p className="text-xs text-muted-foreground">
            How important is it that a service has all your selected channels? Higher values prioritize complete
            coverage.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="additional-features-importance" className="text-sm font-medium">
              Additional Features Importance
            </label>
            <span className="text-sm text-muted-foreground">{additionalFeaturesImportance}/10</span>
          </div>
          <Slider
            id="additional-features-importance"
            min={1}
            max={10}
            step={1}
            value={[additionalFeaturesImportance]}
            onValueChange={(value) => setAdditionalFeaturesImportance(value[0])}
          />
          <p className="text-xs text-muted-foreground">
            How important are additional features like ad-free viewing and multiple streams? Higher values prioritize
            these features.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
