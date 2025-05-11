"use client"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ChannelFiltersProps {
  categories: string[]
  selectedCategory: string
  hasServices: boolean | null
  onCategoryChange: (category: string) => void
  onHasServicesChange: (hasServices: boolean | null) => void
  onReset: () => void
  className?: string
}

export function ChannelFilters({
  categories,
  selectedCategory,
  hasServices,
  onCategoryChange,
  onHasServicesChange,
  onReset,
  className,
}: ChannelFiltersProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="font-semibold mb-3">Categories</h3>
        <RadioGroup value={selectedCategory} onValueChange={onCategoryChange} className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="category-all" />
            <Label htmlFor="category-all" className="cursor-pointer">
              All Categories
            </Label>
          </div>
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <RadioGroupItem value={category} id={`category-${category}`} />
              <Label htmlFor={`category-${category}`} className="cursor-pointer">
                {category}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold mb-3">Availability</h3>
        <RadioGroup
          value={hasServices === null ? "all" : hasServices ? "available" : "unavailable"}
          onValueChange={(value) => {
            if (value === "all") onHasServicesChange(null)
            else if (value === "available") onHasServicesChange(true)
            else onHasServicesChange(false)
          }}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="availability-all" />
            <Label htmlFor="availability-all" className="cursor-pointer">
              All Channels
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="available" id="availability-available" />
            <Label htmlFor="availability-available" className="cursor-pointer">
              Available on Services
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unavailable" id="availability-unavailable" />
            <Label htmlFor="availability-unavailable" className="cursor-pointer">
              Not Available
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <Button variant="outline" onClick={onReset} className="w-full">
        Reset Filters
      </Button>
    </div>
  )
}
