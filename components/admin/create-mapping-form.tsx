"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { getServices, getChannels, createMapping } from "@/app/actions/admin-actions"
import type { StreamingService, Channel } from "@/types/streaming"

const mappingSchema = z.object({
  service_id: z.coerce.number().min(1, { message: "Please select a service." }),
  channel_id: z.coerce.number().min(1, { message: "Please select a channel." }),
  tier: z.enum(["standard", "premium"], { message: "Please select a tier." }),
})

type MappingFormValues = z.infer<typeof mappingSchema>

export function CreateMappingForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [services, setServices] = useState<StreamingService[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [servicesData, channelsData] = await Promise.all([getServices(), getChannels()])
        setServices(servicesData)
        setChannels(channelsData)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load services and channels.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const form = useForm<MappingFormValues>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      service_id: 0,
      channel_id: 0,
      tier: "standard",
    },
  })

  const handleSubmit = async (data: MappingFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createMapping(data)

      if (result.success) {
        toast({
          title: "Success",
          description: "Service-channel mapping created successfully.",
        })
        form.reset()
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create mapping.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div>Loading services and channels...</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="service_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Streaming Service</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>The streaming service to map.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channel_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id.toString()}>
                        {channel.name} ({channel.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>The channel to map.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tier"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tier</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="tier-standard" />
                    <Label htmlFor="tier-standard">Standard</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="premium" id="tier-premium" />
                    <Label htmlFor="tier-premium">Premium</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>The tier at which this channel is available on the service.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Mapping"}
        </Button>
      </form>
    </Form>
  )
}
