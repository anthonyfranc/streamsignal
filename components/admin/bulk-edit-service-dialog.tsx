"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { StreamingService } from "@/types/streaming"

interface BulkEditServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedServices: StreamingService[]
  onBulkUpdate: (ids: number[], updates: Partial<StreamingService>) => Promise<void>
}

export function BulkEditServiceDialog({
  open,
  onOpenChange,
  selectedServices,
  onBulkUpdate,
}: BulkEditServiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fields to update
  const [updatePrice, setUpdatePrice] = useState(false)
  const [price, setPrice] = useState("")

  const [updateMaxStreams, setUpdateMaxStreams] = useState(false)
  const [maxStreams, setMaxStreams] = useState("")

  const [updateHasAds, setUpdateHasAds] = useState(false)
  const [hasAds, setHasAds] = useState(false)

  const [updateHas4K, setUpdateHas4K] = useState(false)
  const [has4K, setHas4K] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedServices.length) {
      toast({
        title: "No services selected",
        description: "Please select at least one service to update.",
        variant: "destructive",
      })
      return
    }

    // Build updates object based on selected fields
    const updates: Partial<StreamingService> = {}

    if (updatePrice) {
      const priceValue = Number.parseFloat(price)
      if (isNaN(priceValue) || priceValue < 0) {
        toast({
          title: "Invalid price",
          description: "Please enter a valid price.",
          variant: "destructive",
        })
        return
      }
      updates.monthly_price = priceValue
    }

    if (updateMaxStreams) {
      const maxStreamsValue = Number.parseInt(maxStreams, 10)
      if (isNaN(maxStreamsValue) || maxStreamsValue < 1) {
        toast({
          title: "Invalid max streams",
          description: "Please enter a valid number of max streams.",
          variant: "destructive",
        })
        return
      }
      updates.max_streams = maxStreamsValue
    }

    if (updateHasAds) {
      updates.has_ads = hasAds
    }

    if (updateHas4K) {
      updates.has_4k = has4K
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: "No changes selected",
        description: "Please select at least one field to update.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await onBulkUpdate(
        selectedServices.map((service) => service.id),
        updates,
      )

      // Reset form
      setUpdatePrice(false)
      setPrice("")
      setUpdateMaxStreams(false)
      setMaxStreams("")
      setUpdateHasAds(false)
      setHasAds(false)
      setUpdateHas4K(false)
      setHas4K(false)

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating services:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Services</DialogTitle>
          <DialogDescription>
            Update multiple services at once. Only checked fields will be updated. Editing {selectedServices.length}{" "}
            service{selectedServices.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-4 pt-4">
              <div className="flex items-start space-x-4">
                <Checkbox
                  id="updatePrice"
                  checked={updatePrice}
                  onCheckedChange={(checked) => setUpdatePrice(checked as boolean)}
                />
                <div className="grid gap-1.5 w-full">
                  <Label htmlFor="price" className="text-sm font-medium">
                    Monthly Price ($)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={!updatePrice}
                    placeholder="e.g. 9.99"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Checkbox
                  id="updateMaxStreams"
                  checked={updateMaxStreams}
                  onCheckedChange={(checked) => setUpdateMaxStreams(checked as boolean)}
                />
                <div className="grid gap-1.5 w-full">
                  <Label htmlFor="maxStreams" className="text-sm font-medium">
                    Max Simultaneous Streams
                  </Label>
                  <Input
                    id="maxStreams"
                    type="number"
                    min="1"
                    value={maxStreams}
                    onChange={(e) => setMaxStreams(e.target.value)}
                    disabled={!updateMaxStreams}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 pt-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    id="updateHasAds"
                    checked={updateHasAds}
                    onCheckedChange={(checked) => setUpdateHasAds(checked as boolean)}
                  />
                  <Label htmlFor="hasAds" className="text-sm font-medium">
                    Has Advertisements
                  </Label>
                </div>
                <Switch id="hasAds" checked={hasAds} onCheckedChange={setHasAds} disabled={!updateHasAds} />
              </div>

              <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    id="updateHas4K"
                    checked={updateHas4K}
                    onCheckedChange={(checked) => setUpdateHas4K(checked as boolean)}
                  />
                  <Label htmlFor="has4K" className="text-sm font-medium">
                    Supports 4K Streaming
                  </Label>
                </div>
                <Switch id="has4K" checked={has4K} onCheckedChange={setHas4K} disabled={!updateHas4K} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Services"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
