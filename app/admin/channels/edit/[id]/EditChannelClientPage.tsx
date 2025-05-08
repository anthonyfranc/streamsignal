"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChannelForm } from "@/components/admin/channel-form"
import { updateChannel } from "@/app/actions/admin-actions"
import type { Channel } from "@/types/streaming"

interface EditChannelClientPageProps {
  channel: Channel
  categories: string[]
}

export default function EditChannelClientPage({ channel, categories }: EditChannelClientPageProps) {
  const handleSubmit = async (data: Omit<Channel, "id" | "created_at">) => {
    return updateChannel(channel.id, data)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Edit Channel</h2>

      <Card>
        <CardHeader>
          <CardTitle>Channel Details</CardTitle>
          <CardDescription>Update the details for this channel.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelForm
            channel={channel}
            categories={categories}
            onSubmit={handleSubmit}
            submitButtonText="Update Channel"
          />
        </CardContent>
      </Card>
    </div>
  )
}
