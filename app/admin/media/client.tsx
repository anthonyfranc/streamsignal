"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MediaBrowser } from "@/components/admin/media/media-browser"
import { MediaUploader } from "@/components/admin/media/media-uploader"
import { UrlUploader } from "@/components/admin/media/url-uploader"

interface MediaPageClientProps {
  activeTab?: string
}

export function MediaPageClient({ activeTab = "browse" }: MediaPageClientProps) {
  const [currentTab, setCurrentTab] = useState(activeTab)

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="browse">Browse Media</TabsTrigger>
        <TabsTrigger value="upload">Upload File</TabsTrigger>
        <TabsTrigger value="url">Upload from URL</TabsTrigger>
      </TabsList>

      <TabsContent value="browse" className="space-y-4">
        <MediaBrowser />
      </TabsContent>

      <TabsContent value="upload" className="space-y-4">
        <MediaUploader
          onUploadComplete={() => {
            setCurrentTab("browse")
          }}
        />
      </TabsContent>

      <TabsContent value="url" className="space-y-4">
        <UrlUploader
          onUploadComplete={() => {
            setCurrentTab("browse")
          }}
        />
      </TabsContent>
    </Tabs>
  )
}
