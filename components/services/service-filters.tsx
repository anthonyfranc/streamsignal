"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface ServiceFiltersProps {
  devices?: string[]
  onFilterChange: (query: string, priceRange: [number, number] | null, selectedDevices: string[]) => void
}

export function ServiceFilters({ devices = [], onFilterChange }: ServiceFiltersProps) {
  const [query, setQuery] = useState("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100])
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])

  // Use a ref to track if this is the initial render
  const isInitialRender = useRef(true)

  // Apply filters whenever they change, but not on initial render
  useEffect(() => {
    // Skip the effect on the initial render
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    // Debounce the filter change to prevent rapid updates
    const timer = setTimeout(() => {
      onFilterChange(query, priceRange, selectedDevices)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, selectedDevices, onFilterChange])

  // Handle price range changes separately to avoid infinite loops with the Slider
  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]])

    // Debounce price range updates
    const timer = setTimeout(() => {
      onFilterChange(query, [value[0], value[1]], selectedDevices)
    }, 300)

    return () => clearTimeout(timer)
  }

  // Handle device selection
  const handleDeviceChange = (device: string, checked: boolean) => {
    setSelectedDevices((prev) => {
      if (checked) {
        return [...prev, device]
      } else {
        return prev.filter((d) => d !== device)
      }
    })
  }

  // Reset all filters
  const handleReset = () => {
    setQuery("")
    setPriceRange([0, 100])
    setSelectedDevices([])
    onFilterChange("", [0, 100], [])
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
      <div>
        <h3 className="text-lg font-medium mb-3">Search</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search services..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-medium mb-3">Price Range</h3>
        <div className="space-y-4">
          <Slider
            defaultValue={[0, 100]}
            max={100}
            step={1}
            value={priceRange}
            onValueChange={handlePriceChange}
            className="mb-2"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm">${priceRange[0]}</span>
            <span className="text-sm">${priceRange[1]}</span>
          </div>
        </div>
      </div>

      {devices && devices.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-lg font-medium mb-3">Devices</h3>
            <div className="space-y-2">
              {devices.map((device) => (
                <div key={device} className="flex items-center space-x-2">
                  <Checkbox
                    id={`device-${device}`}
                    checked={selectedDevices.includes(device)}
                    onCheckedChange={(checked) => handleDeviceChange(device, checked === true)}
                  />
                  <Label
                    htmlFor={`device-${device}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {device}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      <Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Reset Filters
      </Button>
    </div>
  )
}
