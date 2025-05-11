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
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Channel } from "@/types/streaming"

interface BulkEditChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedChannels: Channel[]
  categories: string[]
  onBulkUpdate: (ids: number[], updates: Partial<Channel>) => Promise<void>
}

export function BulkEditChannelDialog({
  open,
  onOpenChange,
  selectedChannels,
  categories,
  onBulkUpdate,
}: BulkEditChannelDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fields to update
  const [updateCategory, setUpdateCategory] = useState(false)
  const [category, setCategory] = useState("")

  const [updatePopularity, setUpdatePopularity] = useState(false)
  const [popularity, setPopularity] = useState("")

  const [updateLanguage, setUpdateLanguage] = useState(false)
  const [language, setLanguage] = useState("English")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedChannels.length) {
      toast({
        title: "No channels selected",
        description: "Please select at least one channel to update.",
        variant: "destructive",
      })
      return
    }

    // Build updates object based on selected fields
    const updates: Partial<Channel> = {}

    if (updateCategory && category) {
      updates.category = category
    }

    if (updatePopularity) {
      const popularityValue = Number.parseInt(popularity, 10)
      if (isNaN(popularityValue) || popularityValue < 0 || popularityValue > 100) {
        toast({
          title: "Invalid popularity",
          description: "Please enter a valid popularity score (0-100).",
          variant: "destructive",
        })
        return
      }
      updates.popularity = popularityValue
    }

    if (updateLanguage && language) {
      updates.language = language
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
        selectedChannels.map((channel) => channel.id),
        updates,
      )

      // Reset form
      setUpdateCategory(false)
      setCategory("")
      setUpdatePopularity(false)
      setPopularity("")
      setUpdateLanguage(false)
      setLanguage("English")

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating channels:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Channels</DialogTitle>
          <DialogDescription>
            Update multiple channels at once. Only checked fields will be updated. Editing {selectedChannels.length}{" "}
            channel{selectedChannels.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 pt-4">
              <div className="flex items-start space-x-4">
                <Checkbox
                  id="updateCategory"
                  checked={updateCategory}
                  onCheckedChange={(checked) => setUpdateCategory(checked as boolean)}
                />
                <div className="grid gap-1.5 w-full">
                  <Label htmlFor="category" className="text-sm font-medium">
                    Category
                  </Label>
                  <Select disabled={!updateCategory} value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Checkbox
                  id="updateLanguage"
                  checked={updateLanguage}
                  onCheckedChange={(checked) => setUpdateLanguage(checked as boolean)}
                />
                <div className="grid gap-1.5 w-full">
                  <Label htmlFor="language" className="text-sm font-medium">
                    Language
                  </Label>
                  <Select disabled={!updateLanguage} value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select a language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Japanese">Japanese</SelectItem>
                      <SelectItem value="Korean">Korean</SelectItem>
                      <SelectItem value="Chinese">Chinese</SelectItem>
                      <SelectItem value="Multiple">Multiple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4 pt-4">
              <div className="flex items-start space-x-4">
                <Checkbox
                  id="updatePopularity"
                  checked={updatePopularity}
                  onCheckedChange={(checked) => setUpdatePopularity(checked as boolean)}
                />
                <div className="grid gap-1.5 w-full">
                  <Label htmlFor="popularity" className="text-sm font-medium">
                    Popularity Score (0-100)
                  </Label>
                  <Input
                    id="popularity"
                    type="number"
                    min="0"
                    max="100"
                    value={popularity}
                    onChange={(e) => setPopularity(e.target.value)}
                    disabled={!updatePopularity}
                    placeholder="e.g. 85"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Channels"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
