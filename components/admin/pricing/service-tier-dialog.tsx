"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { createServiceTier, updateServiceTier, clearPromotion } from "@/app/actions/pricing-actions"
import type { ServiceTier } from "@/types/pricing"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Trash2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"

const tierSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  features: z.string().transform((val) => val.split("\n").filter(Boolean)),
  is_popular: z.boolean().default(false),
  max_streams: z.coerce.number().int().min(1, { message: "Max streams must be at least 1." }),
  video_quality: z.string().min(2, { message: "Video quality must be specified." }),
  has_ads: z.boolean().default(true),
  // Promotional fields
  promo_price: z.coerce.number().nullable().optional(),
  promo_start_date: z.string().nullable().optional(),
  promo_end_date: z.string().nullable().optional(),
  promo_description: z.string().nullable().optional(),
})

type TierFormValues = z.infer<typeof tierSchema>

interface ServiceTierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: number
  tier: ServiceTier | null
  onClose: (tier?: ServiceTier) => void
}

export function ServiceTierDialog({ open, onOpenChange, serviceId, tier, onClose }: ServiceTierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [promoStartDate, setPromoStartDate] = useState<Date | undefined>(
    tier?.promo_start_date ? new Date(tier.promo_start_date) : undefined,
  )
  const [promoEndDate, setPromoEndDate] = useState<Date | undefined>(
    tier?.promo_end_date ? new Date(tier.promo_end_date) : undefined,
  )
  const [clearingPromo, setClearingPromo] = useState(false)

  const isEditing = !!tier

  const defaultValues: Partial<TierFormValues> = {
    name: tier?.name || "",
    price: tier?.price || 0,
    description: tier?.description || "",
    features: tier?.features ? tier.features.join("\n") : "",
    is_popular: tier?.is_popular || false,
    max_streams: tier?.max_streams || 1,
    video_quality: tier?.video_quality || "Standard",
    has_ads: tier?.has_ads ?? true,
    promo_price: tier?.promo_price || null,
    promo_start_date: tier?.promo_start_date || null,
    promo_end_date: tier?.promo_end_date || null,
    promo_description: tier?.promo_description || null,
  }

  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierSchema),
    defaultValues,
    mode: "onChange",
  })

  const handleSubmit = async (data: TierFormValues) => {
    setIsSubmitting(true)

    // Format dates for submission
    const formattedData = {
      ...data,
      promo_start_date: promoStartDate ? promoStartDate.toISOString() : null,
      promo_end_date: promoEndDate ? promoEndDate.toISOString() : null,
    }

    try {
      if (isEditing && tier) {
        // Update existing tier
        const result = await updateServiceTier({
          id: tier.id,
          service_id: serviceId,
          ...formattedData,
        })

        if (result.success) {
          toast({
            title: "Success",
            description: "Pricing tier updated successfully",
          })
          onClose({
            ...tier,
            ...formattedData,
            service_id: serviceId,
          })
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update pricing tier",
            variant: "destructive",
          })
        }
      } else {
        // Create new tier
        const result = await createServiceTier({
          service_id: serviceId,
          sort_order: 999, // Will be reordered when displayed
          ...formattedData,
        })

        if (result.success && result.id) {
          toast({
            title: "Success",
            description: "Pricing tier created successfully",
          })
          onClose({
            id: result.id,
            service_id: serviceId,
            created_at: new Date().toISOString(),
            sort_order: 999,
            ...formattedData,
          })
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create pricing tier",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearPromotion = async () => {
    if (!tier) return

    setClearingPromo(true)
    try {
      const result = await clearPromotion(tier.id, serviceId)

      if (result.success) {
        toast({
          title: "Success",
          description: "Promotion cleared successfully",
        })

        // Reset form values
        form.setValue("promo_price", null)
        form.setValue("promo_description", null)
        setPromoStartDate(undefined)
        setPromoEndDate(undefined)

        // Update the tier object
        const updatedTier = {
          ...tier,
          promo_price: null,
          promo_start_date: null,
          promo_end_date: null,
          promo_description: null,
        }

        onClose(updatedTier)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to clear promotion",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setClearingPromo(false)
    }
  }

  const hasPromotion =
    !!form.watch("promo_price") || !!promoStartDate || !!promoEndDate || !!form.watch("promo_description")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Pricing Tier" : "Add Pricing Tier"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this pricing tier." : "Create a new pricing tier for this service."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="promotion">Promotional Pricing</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
              <TabsContent value="general" className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Basic, Standard, Premium, etc." {...field} />
                        </FormControl>
                        <FormDescription>The name of this pricing tier.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
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
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe this tier..." {...field} />
                      </FormControl>
                      <FormDescription>A brief description of this pricing tier.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="video_quality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Quality</FormLabel>
                        <FormControl>
                          <Input placeholder="SD, HD, 4K, etc." {...field} />
                        </FormControl>
                        <FormDescription>The video quality for this tier.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter features, one per line..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormDescription>List features, one per line.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="is_popular"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Popular Tier</FormLabel>
                          <FormDescription>Mark this as the most popular tier.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="has_ads"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Contains Ads</FormLabel>
                          <FormDescription>Does this tier include advertisements?</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="promotion" className="space-y-6">
                {isEditing && hasPromotion && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearPromotion}
                      disabled={clearingPromo}
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {clearingPromo ? "Clearing..." : "Clear Promotion"}
                    </Button>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="promo_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotional Price ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter promotional price"
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : Number.parseFloat(e.target.value)
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormDescription>The discounted price during the promotional period.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormItem className="flex flex-col">
                    <FormLabel>Promotion Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !promoStartDate && "text-muted-foreground",
                            )}
                          >
                            {promoStartDate ? format(promoStartDate, "PPP") : "Select date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={promoStartDate}
                          onSelect={setPromoStartDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>When the promotion starts.</FormDescription>
                  </FormItem>

                  <FormItem className="flex flex-col">
                    <FormLabel>Promotion End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !promoEndDate && "text-muted-foreground",
                            )}
                          >
                            {promoEndDate ? format(promoEndDate, "PPP") : "Select date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={promoEndDate}
                          onSelect={setPromoEndDate}
                          disabled={(date) => date < new Date() || (promoStartDate ? date < promoStartDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>When the promotion ends.</FormDescription>
                  </FormItem>
                </div>

                <FormField
                  control={form.control}
                  name="promo_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotion Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe this promotion..."
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description of this promotion (e.g., "Summer Sale", "New Year Special").
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("price") && form.watch("promo_price") && (
                  <Alert>
                    <AlertDescription>
                      {(() => {
                        const regularPrice = Number.parseFloat(form.watch("price").toString())
                        const promoPrice = Number.parseFloat(form.watch("promo_price").toString())
                        if (promoPrice >= regularPrice) {
                          return "Warning: Promotional price should be lower than the regular price."
                        }
                        const savings = regularPrice - promoPrice
                        const savingsPercent = (savings / regularPrice) * 100
                        return `Savings: $${savings.toFixed(2)} (${savingsPercent.toFixed(0)}% off)`
                      })()}
                    </AlertDescription>
                  </Alert>
                )}

                {(!promoStartDate || !promoEndDate) && form.watch("promo_price") && (
                  <Alert>
                    <AlertDescription>Please set both start and end dates for the promotion.</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : isEditing ? "Update Tier" : "Create Tier"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
