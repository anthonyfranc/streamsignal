import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getMappings,
  getServices,
  getChannels,
  getChannelCategories,
  deleteMapping,
  updateMapping,
} from "@/app/actions/admin-actions"
import { MappingsClientWrapper } from "./client-wrapper"
import { CreateMappingForm } from "@/components/admin/create-mapping-form"
import { Button } from "@/components/ui/button"
import { Move } from "lucide-react"

export const metadata: Metadata = {
  title: "Service-Channel Mappings - StreamSignal Admin",
  description: "Manage service-channel mappings in the StreamSignal platform",
}

export default async function MappingsPage() {
  // Fetch all the data needed for the page
  const [mappings, services, channels, categories] = await Promise.all([
    getMappings(),
    getServices(),
    getChannels(),
    getChannelCategories(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Service-Channel Mappings</h2>
          <p className="text-muted-foreground">
            Connect streaming services to channels and manage their availability tiers.
          </p>
        </div>
        <Button asChild>
          <a href="/admin/mappings/visual">
            <Move className="mr-2 h-4 w-4" />
            Visual Editor
          </a>
        </Button>
      </div>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage Mappings</TabsTrigger>
          <TabsTrigger value="create">Create New Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Manage Mappings</CardTitle>
              <CardDescription>View and manage existing service-channel mappings.</CardDescription>
            </CardHeader>
            <CardContent>
              <MappingsClientWrapper
                mappings={mappings}
                services={services}
                channels={channels}
                categories={categories}
                deleteMappingAction={deleteMapping}
                updateMappingAction={updateMapping}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Mapping</CardTitle>
              <CardDescription>Connect a streaming service to a channel.</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateMappingForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
