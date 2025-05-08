import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getServices, deleteService, bulkDeleteServices, bulkUpdateServices } from "@/app/actions/admin-actions"
import { ServiceTable } from "@/components/admin/service-table"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"

export const metadata: Metadata = {
  title: "Services Management - StreamSignal Admin",
  description: "Manage streaming services in the StreamSignal platform",
}

export default async function ServicesPage() {
  const services = await getServices()

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Services", href: "/admin/services", active: true },
        ]}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Streaming Services</h2>
        <Button asChild>
          <Link href="/admin/services/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Services</CardTitle>
          <CardDescription>View, edit, and delete streaming services in the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceTable
            services={services}
            deleteServiceAction={deleteService}
            bulkDeleteServicesAction={bulkDeleteServices}
            bulkUpdateServicesAction={bulkUpdateServices}
          />
        </CardContent>
      </Card>
    </div>
  )
}
