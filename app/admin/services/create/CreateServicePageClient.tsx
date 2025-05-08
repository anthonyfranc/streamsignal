"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceForm } from "@/components/admin/service-form"
import { createService } from "@/app/actions/admin-actions"

export default function CreateServicePageClient() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Add Streaming Service</h2>

      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>Enter the details for the new streaming service.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceForm onSubmit={createService} submitButtonText="Create Service" />
        </CardContent>
      </Card>
    </div>
  )
}
