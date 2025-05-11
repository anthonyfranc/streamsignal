"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import type { ContentItem } from "@/types/streaming"

const formSchema = z.object({
  category_id: z.number(),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  image_url: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  content_type: z.string().max(50, "Content type must be 50 characters or less").optional(),
  year: z.number().int().min(1900, "Year must be 1900 or later").max(2100, "Year must be 2100 or earlier").optional(),
  rating: z.string().max(10, "Rating must be 10 characters or less").optional(),
  duration_minutes: z.number().int().min(0, "Duration must be a positive number").optional(),
  display_order: z.number().int().min(0, "Display order must be a positive number"),
})

interface ContentItemFormProps {
  categoryId: number
  item?: ContentItem
  onSubmit: (data: Omit<ContentItem, "id" | "created_at">) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
}

export function ContentItemForm({ categoryId, item, onSubmit, onCancel }: ContentItemFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: categoryId,
      title: item?.title || "",
      description: item?.description || "",
      image_url: item?.image_url || "",
      content_type: item?.content_type || "",
      year: item?.year || undefined,
      rating: item?.rating || "",
      duration_minutes: item?.duration_minutes || undefined,
      display_order: item?.display_order || 0,
    },
  })

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const result = await onSubmit(values)
      if (result.success) {
        toast({
          title: "Success",
          description: item ? "Content item updated successfully." : "Content item created successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save content item.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input disabled={isLoading} {...field} />
              </FormControl>
              <FormDescription>The title of the content item.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea disabled={isLoading} {...field} />
              </FormControl>
              <FormDescription>A brief description of this content item.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input disabled={isLoading} {...field} />
              </FormControl>
              <FormDescription>URL to an image representing this content item.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="content_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content Type</FormLabel>
                <Select disabled={isLoading} onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a content type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Movie">Movie</SelectItem>
                    <SelectItem value="TV Show">TV Show</SelectItem>
                    <SelectItem value="Documentary">Documentary</SelectItem>
                    <SelectItem value="Series">Series</SelectItem>
                    <SelectItem value="Special">Special</SelectItem>
                    <SelectItem value="Live Event">Live Event</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Kids">Kids</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>The type of content.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1900"
                    max="2100"
                    disabled={isLoading}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>The release year.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating</FormLabel>
                <Select disabled={isLoading} onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="G">G</SelectItem>
                    <SelectItem value="PG">PG</SelectItem>
                    <SelectItem value="PG-13">PG-13</SelectItem>
                    <SelectItem value="R">R</SelectItem>
                    <SelectItem value="NC-17">NC-17</SelectItem>
                    <SelectItem value="TV-Y">TV-Y</SelectItem>
                    <SelectItem value="TV-Y7">TV-Y7</SelectItem>
                    <SelectItem value="TV-G">TV-G</SelectItem>
                    <SelectItem value="TV-PG">TV-PG</SelectItem>
                    <SelectItem value="TV-14">TV-14</SelectItem>
                    <SelectItem value="TV-MA">TV-MA</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>The content rating.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    disabled={isLoading}
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription>The duration in minutes.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="display_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  disabled={isLoading}
                  {...field}
                  onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>The order in which this item appears (lower numbers appear first).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : item ? "Update Item" : "Create Item"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
