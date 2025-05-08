import { getServiceById } from "@/app/actions/admin-actions"
import { getContentCategoriesWithItemsByServiceId, getAddonServicesByParentId } from "@/app/actions/content-actions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContentCategoriesManager } from "@/components/admin/content/content-categories-manager"
import { AddonServicesManager } from "@/components/admin/content/addon-services-manager"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

interface ContentManagementPageProps {
  params: {
    id: string
  }
}

export default async function ContentManagementPage({ params }: ContentManagementPageProps) {
  const serviceId = Number.parseInt(params.id)
  const service = await getServiceById(serviceId)

  if (!service) {
    notFound()
  }

  const categories = await getContentCategoriesWithItemsByServiceId(serviceId)
  const addonServices = await getAddonServicesByParentId(serviceId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Content Management: {service.name}</h1>
        <Button variant="outline" asChild>
          <Link href={`/admin/services/${serviceId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Service
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Content Categories</TabsTrigger>
          <TabsTrigger value="addons">Add-on Services</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <ContentCategoriesManager serviceId={serviceId} categories={categories} />
        </TabsContent>

        <TabsContent value="addons" className="mt-6">
          <AddonServicesManager serviceId={serviceId} addons={addonServices} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
