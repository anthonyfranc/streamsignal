import type { Metadata } from "next"
import { ChannelDirectory } from "@/components/channels/channel-directory"
import { getAllChannelsWithServices } from "@/app/actions/channel-actions"

export const metadata: Metadata = {
  title: "Channel Directory - StreamSignal",
  description:
    "Browse our comprehensive directory of channels and find out which streaming services offer your favorites.",
  keywords: ["streaming", "channels", "tv channels", "networks", "streaming services"],
}

export default async function ChannelDirectoryPage() {
  const channelsWithServices = await getAllChannelsWithServices()

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Channel Directory</h1>
        <p className="mt-4 text-gray-700 md:text-xl max-w-3xl mx-auto">
          Browse our comprehensive directory of channels and find out which streaming services offer your favorites.
        </p>
      </div>

      <ChannelDirectory initialChannels={channelsWithServices} />
    </div>
  )
}
