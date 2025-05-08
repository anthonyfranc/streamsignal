"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChannelForm } from "@/components/admin/channel-form"
import { createChannel } from "@/app/actions/admin-actions"

interface CreateChannelPageClientProps {
  categories: string[]
}

export default function CreateChannelPageClient({ categories }: CreateChannelPageClientProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Add Channel</h2>

      <Card>
        <CardHeader>
          <CardTitle>Channel Details</CardTitle>
          <CardDescription>Enter the details for the new channel.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelForm categories={categories} onSubmit={createChannel} submitButtonText="Create Channel" />
        </CardContent>
      </Card>
    </div>
  )
}
