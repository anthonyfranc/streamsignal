import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getChannels, deleteChannel, bulkDeleteChannels, bulkUpdateChannels } from "@/app/actions/admin-actions"
import { ChannelTable } from "@/components/admin/channel-table"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"

export const metadata: Metadata = {
  title: "Channels Management - StreamSignal Admin",
  description: "Manage channels in the StreamSignal platform",
}

export default async function ChannelsPage() {
  const channels = await getChannels()

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Channels", href: "/admin/channels", active: true },
        ]}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Channels</h2>
        <Button asChild>
          <Link href="/admin/channels/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Channel
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Channels</CardTitle>
          <CardDescription>View, edit, and delete channels in the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelTable
            channels={channels}
            deleteChannelAction={deleteChannel}
            bulkDeleteChannelsAction={bulkDeleteChannels}
            bulkUpdateChannelsAction={bulkUpdateChannels}
          />
        </CardContent>
      </Card>
    </div>
  )
}
