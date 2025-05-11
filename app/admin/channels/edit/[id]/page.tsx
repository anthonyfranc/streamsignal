import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getChannelById, getChannelCategories } from "@/app/actions/admin-actions"
import EditChannelClientPage from "./EditChannelClientPage"

export const metadata: Metadata = {
  title: "Edit Channel - StreamSignal Admin",
  description: "Edit an existing channel on the StreamSignal platform",
}

interface EditChannelPageProps {
  params: {
    id: string
  }
}

export default async function EditChannelPage({ params }: EditChannelPageProps) {
  const channelId = Number.parseInt(params.id, 10)

  if (isNaN(channelId)) {
    notFound()
  }

  // Fetch channel and categories on the server
  const [channel, categories] = await Promise.all([getChannelById(channelId), getChannelCategories()])

  if (!channel) {
    notFound()
  }

  // Pass channel and categories as props to the client component
  return <EditChannelClientPage channel={channel} categories={categories} />
}
