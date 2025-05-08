"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import type { Channel } from "@/types/streaming"
import { MediaSelector } from "@/components/admin/media/media-selector"

// Updated schema to handle both URLs and media asset IDs
const channelSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  logo_url: z.string().optional().nullable(),
  category: z.string().min(1, { message: "Please select a category." }),
  popularity: z.number().min(1).max(100),
})

type ChannelFormValues = z.infer<typeof channelSchema>

interface ChannelFormProps {
  channel?: Channel
  categories: string[]
  onSubmit: (data: Omit<Channel, "id" | "created_at">) => Promise<{ success: boolean; id?: number; error?: string }>
  submitButtonText: string
}

export function ChannelForm({ channel, categories, onSubmit, submitButtonText }: ChannelFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const defaultValues: Partial<ChannelFormValues> = {
    name: channel?.name || "",
    logo_url: channel?.logo_url || "",
    category: channel?.category || "",
    popularity: channel?.popularity || 50,
  }

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues,
  })

  const handleSubmit = async (data: ChannelFormValues) => {
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      // Ensure data is properly formatted
      const formattedData = {
        ...data,
        // Convert empty string to null for logo_url
        logo_url: data.logo_url || null,
        // Ensure popularity is a number
        popularity: Number(data.popularity),
      }

      console.log("Submitting channel data:", formattedData)

      const result = await onSubmit(formattedData as Omit<Channel, "id" | "created_at">)

      if (result.success) {
        toast({
          title: "Success",
          description: `Channel ${channel ? "updated" : "created"} successfully.`,
        })
        router.push("/admin/channels")
        router.refresh()
      } else {
        setSubmissionError(result.error || `Failed to ${channel ? "update" : "create"} channel.`)
        toast({
          title: "Error",
          description: result.error || `Failed to ${channel ? "update" : "create"} channel.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      setSubmissionError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Channel name" {...field} />
              </FormControl>
              <FormDescription>The name of the channel.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo</FormLabel>
              <FormControl>
                <MediaSelector
                  value={field.value || ""}
                  onChange={field.onChange}
                  category="logo"
                  label="Select Channel Logo"
                />
              </FormControl>
              <FormDescription>Logo image for the channel.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The category this channel belongs to.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="popularity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Popularity (1-100)</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    defaultValue={[field.value]}
                    onValueChange={(values) => field.onChange(values[0])}
                  />
                  <div className="flex justify-between">
                    <span className="text-xs">1</span>
                    <span className="text-xs font-medium">{field.value}</span>
                    <span className="text-xs">100</span>
                  </div>
                </div>
              </FormControl>
              <FormDescription>The popularity rating of this channel.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {submissionError && <div className="text-red-500 text-sm">Error: {submissionError}</div>}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/channels")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  )
}
