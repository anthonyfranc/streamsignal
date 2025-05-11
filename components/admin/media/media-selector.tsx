"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ImageIcon, X } from "lucide-react"
import { MediaUploader } from "./media-uploader"
import { UrlUploader } from "./url-uploader"
import { MediaBrowser } from "./media-browser"
import { getMediaAssetById, type MediaAsset } from "@/app/actions/media-actions"

interface MediaSelectorProps {
  value?: string | number
  onChange: (value: string) => void
  category?: string
  label?: string
}

// Helper function to check if a string is a URL
function isUrl(str: string): boolean {
  return str && (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("/placeholder"))
}

// Helper function to check if a string is a numeric ID
function isNumericId(str: string): boolean {
  return /^\d+$/.test(str)
}

export function MediaSelector({ value, onChange, category, label = "Select Media" }: MediaSelectorProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("browse")
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)

  // Load media asset on component mount or when value changes
  useEffect(() => {
    const loadMedia = async () => {
      if (!value) {
        setSelectedMedia(null)
        setDisplayUrl(null)
        return
      }

      const valueStr = String(value)

      // If it's a URL, just display it
      if (isUrl(valueStr)) {
        setDisplayUrl(valueStr)
        setSelectedMedia(null)
        return
      }

      // If it's a numeric ID, try to fetch the media asset
      if (isNumericId(valueStr)) {
        setIsLoading(true)
        try {
          const mediaId = Number.parseInt(valueStr, 10)
          const media = await getMediaAssetById(mediaId)
          if (media) {
            setSelectedMedia(media)
            setDisplayUrl(media.url)
          } else {
            // If media not found, clear the selection
            setSelectedMedia(null)
            setDisplayUrl(null)
          }
        } catch (error) {
          console.error("Error loading media asset:", error)
          setSelectedMedia(null)
          setDisplayUrl(null)
        } finally {
          setIsLoading(false)
        }
        return
      }

      // If it's neither a URL nor a numeric ID, clear the selection
      setSelectedMedia(null)
      setDisplayUrl(null)
    }

    loadMedia()
  }, [value])

  const handleMediaSelect = (asset: MediaAsset) => {
    setSelectedMedia(asset)
    setDisplayUrl(asset.url)
    onChange(String(asset.id)) // Pass the ID as a string to the parent component
    setOpen(false)
  }

  const handleUploadComplete = (id: number, url: string) => {
    setSelectedMedia({
      id,
      url,
      filename: "",
      original_filename: "Uploaded Media",
      file_size: 0,
      mime_type: "",
      category: category || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setDisplayUrl(url)
    onChange(String(id)) // Pass the ID as a string to the parent component
    setOpen(false)
  }

  const handleClear = () => {
    setSelectedMedia(null)
    setDisplayUrl(null)
    onChange("") // Clear the value in the parent component
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {displayUrl ? (
        <div className="relative border rounded-md p-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 rounded-full"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear selection</span>
          </Button>

          <div className="h-16 w-16 rounded overflow-hidden bg-muted flex items-center justify-center">
            <img
              src={displayUrl || "/placeholder.svg"}
              alt={selectedMedia?.original_filename || "Selected media"}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedMedia?.original_filename || "Selected media"}</p>
            {selectedMedia && (
              <p className="text-xs text-muted-foreground">
                {(selectedMedia.file_size / 1024 / 1024).toFixed(2)} MB • {selectedMedia.mime_type}
              </p>
            )}
          </div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <ImageIcon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Media</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="browse">Browse Media</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="url">Upload from URL</TabsTrigger>
              </TabsList>
              <TabsContent value="browse">
                <MediaBrowser onSelect={handleMediaSelect} category={category} />
              </TabsContent>
              <TabsContent value="upload">
                <MediaUploader onUploadComplete={handleUploadComplete} defaultCategory={category} />
              </TabsContent>
              <TabsContent value="url">
                <UrlUploader onUploadComplete={handleUploadComplete} defaultCategory={category} />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
