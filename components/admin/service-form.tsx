"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import type { StreamingService } from "@/types/streaming"
import { MediaSelector } from "@/components/admin/media/media-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const serviceSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  logo_url: z.string().optional().nullable(),
  monthly_price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  features: z.string().transform((val) => val.split("\n").filter(Boolean)),
  max_streams: z.coerce.number().int().min(1, { message: "Max streams must be at least 1." }),
  has_ads: z.boolean().default(false),
  content_structure_type: z.enum(["channels", "categories", "hybrid", "add_ons"]),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

interface ServiceFormProps {
  service: StreamingService
  onSubmit: (
    data: Omit<StreamingService, "id" | "created_at">,
  ) => Promise<{ success: boolean; id?: number; error?: string }>
  submitButtonText: string
}

export function ServiceForm({ service, onSubmit, submitButtonText }: ServiceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  const defaultValues: Partial<ServiceFormValues> = {
    name: service?.name || "",
    logo_url: service?.logo_url || "",
    monthly_price: service?.monthly_price || 0,
    description: service?.description || "",
    features: service?.features ? service.features.join("\n") : "",
    max_streams: service?.max_streams || 1,
    has_ads: service?.has_ads || false,
    content_structure_type: service?.content_structure_type || "channels",
  }

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues,
    mode: "onChange",
  })

  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const handleSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      // Ensure data is properly formatted
      const formattedData = {
        ...data,
        // Convert empty string to null for logo_url
        logo_url: data.logo_url || null,
        // Ensure numeric fields are numbers
        monthly_price: Number(data.monthly_price),
        max_streams: Number(data.max_streams),
      }

      console.log("Submitting service data:", formattedData)

      const result = await onSubmit(formattedData as Omit<StreamingService, "id" | "created_at">)

      if (result.success) {
        toast({
          title: "Success",
          description: `Service ${service ? "updated" : "created"} successfully.`,
        })
        router.push("/admin/services")
        router.refresh()
      } else {
        setSubmissionError(result.error || `Failed to ${service ? "update" : "create"} service.`)
        toast({
          title: "Error",
          description: result.error || `Failed to ${service ? "update" : "create"} service.`,
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
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="details">Details & Features</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 pt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Netflix, Hulu, etc." {...field} />
                          </FormControl>
                          <FormDescription>The name of the streaming service.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Logo</FormLabel>
                          <FormControl>
                            <MediaSelector
                              value={field.value || ""}
                              onChange={(url) => field.onChange(url)}
                              category="logo"
                              label="Select Service Logo"
                            />
                          </FormControl>
                          <FormDescription>Logo image for the streaming service.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="monthly_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormDescription>The monthly subscription price in USD.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_streams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Simultaneous Streams</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormDescription>Maximum number of simultaneous streams allowed.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 pt-4">
              <Card>
                <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the service..." className="min-h-32" {...field} />
                        </FormControl>
                        <FormDescription>A detailed description of the streaming service.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter features, one per line..." className="min-h-32" {...field} />
                        </FormControl>
                        <FormDescription>List features, one per line.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="has_ads"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Contains Advertisements</FormLabel>
                          <FormDescription>Does this service include advertisements in its content?</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="content_structure_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Structure Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select content structure type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="channels">Channels</SelectItem>
                            <SelectItem value="categories">Categories</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                            <SelectItem value="add_ons">Add-ons</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Determines how content is organized within this service.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {submissionError && <div className="text-red-500 text-sm">Error: {submissionError}</div>}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/services")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : submitButtonText}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
