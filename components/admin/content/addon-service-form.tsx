"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { getAvailableAddonServices } from "@/app/actions/content-admin-actions"
import type { AddonService } from "@/types/streaming"

const formSchema = z.object({
  parent_service_id: z.number(),
  addon_service_id: z.number(),
  price_addition: z.number().min(0, "Price must be a positive number"),
})

interface AddonServiceFormProps {
  parentServiceId: number
  addon?: AddonService
  onSubmit: (data: Omit<AddonService, "id" | "created_at">) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
}

export function AddonServiceForm({ parentServiceId, addon, onSubmit, onCancel }: AddonServiceFormProps) {
  const [availableServices, setAvailableServices] = useState<{ id: number; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parent_service_id: parentServiceId,
      addon_service_id: addon?.addon_service_id || 0,
      price_addition: addon?.price_addition || 0,
    },
  })

  useEffect(() => {
    const fetchAvailableServices = async () => {
      try {
        const services = await getAvailableAddonServices(parentServiceId)

        // If we're editing, we need to include the current addon service
        if (addon && addon.addon_service) {
          const currentAddonExists = services.some((service) => service.id === addon.addon_service_id)
          if (!currentAddonExists) {
            services.push({
              id: addon.addon_service_id,
              name: addon.addon_service.name || `Service #${addon.addon_service_id}`,
            })
          }
        }

        setAvailableServices(services)
      } catch (error) {
        console.error("Failed to fetch available services:", error)
        toast({
          title: "Error",
          description: "Failed to load available services. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchAvailableServices()
  }, [parentServiceId, addon])

  async function handleSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const result = await onSubmit(values)
      if (result.success) {
        toast({
          title: "Success",
          description: addon ? "Add-on service updated successfully." : "Add-on service added successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save add-on service.",
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
          name="addon_service_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add-on Service</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={(value) => field.onChange(Number.parseInt(value))}
                defaultValue={field.value ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Select the service to add as an add-on.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price_addition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price Addition</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    disabled={isLoading}
                    {...field}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                  />
                </div>
              </FormControl>
              <FormDescription>The additional monthly cost for this add-on service.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : addon ? "Update Add-on" : "Add Add-on"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
