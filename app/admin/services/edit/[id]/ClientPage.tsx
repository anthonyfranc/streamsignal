"use client"

import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceForm } from "@/components/admin/service-form"
import { getServiceById, updateService } from "@/app/actions/admin-actions"
import { useEffect, useState } from "react"
import type { StreamingService } from "@/types/streaming"
import { toast } from "@/components/ui/use-toast"

interface EditServicePageProps {
  id: string // Changed from params object to direct id prop
}

export default function EditServicePage({ id }: EditServicePageProps) {
  const serviceId = Number.parseInt(id, 10) // Use the id prop directly
  const [service, setService] = useState<StreamingService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchService = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Ensure serviceId is properly parsed as a number
        if (isNaN(serviceId)) {
          console.error("Invalid service ID:", id)
          setError("Invalid service ID")
          return
        }

        console.log(`Fetching service ID: ${serviceId}`)
        const fetchedService = await getServiceById(serviceId)

        console.log("Fetched service data:", fetchedService)

        if (!fetchedService) {
          setError("Service not found")
          notFound()
          return
        }

        setService(fetchedService)
      } catch (err) {
        console.error("Error fetching service:", err)
        setError(err instanceof Error ? err.message : "Failed to load service")
        toast({
          title: "Error",
          description: "Failed to load service information",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchService()
  }, [serviceId, id])

  const handleUpdate = async (data: any) => {
    try {
      console.log("Updating service with data:", data)
      return await updateService(serviceId, data)
    } catch (err) {
      console.error("Error updating service:", err)
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update service",
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500">Error</h2>
        <p className="mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Edit Streaming Service</h2>

      <Card>
        <CardHeader>
          <CardTitle>Edit {service?.name}</CardTitle>
          <CardDescription>Update the details for this streaming service.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceForm service={service!} onSubmit={handleUpdate} submitButtonText="Update Service" />
        </CardContent>
      </Card>
    </div>
  )
}
