import { MediaPageClient } from "./client"

export const metadata = {
  title: "Media Library - StreamSignal Admin",
  description: "Manage media assets for your streaming services and channels",
}

export default function MediaPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Upload, browse, and manage media assets for your streaming services and channels
          </p>
        </div>
      </div>

      <MediaPageClient activeTab="browse" />
    </div>
  )
}
