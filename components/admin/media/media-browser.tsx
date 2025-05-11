"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination } from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Search, ImageIcon, FileText, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import {
  getMediaAssets,
  getMediaCategories,
  getMediaUsageByAssetId,
  deleteMediaAsset,
  type MediaAsset,
  type MediaCategory,
  type MediaUsage,
} from "@/app/actions/media-actions"

interface MediaBrowserProps {
  onSelect?: (asset: MediaAsset) => void
  category?: string
}

export function MediaBrowser({ onSelect, category: initialCategory }: MediaBrowserProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [categories, setCategories] = useState<MediaCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalAssets, setTotalAssets] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
  const [assetUsage, setAssetUsage] = useState<MediaUsage[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const itemsPerPage = 12

  // Load media assets
  const loadAssets = async () => {
    setIsLoading(true)
    try {
      const { assets: fetchedAssets, total } = await getMediaAssets({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      })
      setAssets(fetchedAssets)
      setTotalAssets(total)
    } catch (error) {
      console.error("Error loading media assets:", error)
      toast({
        title: "Error",
        description: "Failed to load media assets",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load categories
  const loadCategories = async () => {
    try {
      const fetchedCategories = await getMediaCategories()
      setCategories(fetchedCategories)
    } catch (error) {
      console.error("Error loading media categories:", error)
    }
  }

  // Load asset usage
  const loadAssetUsage = async (assetId: number) => {
    try {
      const usage = await getMediaUsageByAssetId(assetId)
      setAssetUsage(usage)
    } catch (error) {
      console.error("Error loading asset usage:", error)
      setAssetUsage([])
    }
  }

  // Initial load
  useEffect(() => {
    loadCategories()
  }, [])

  // Load assets when filters or pagination changes
  useEffect(() => {
    loadAssets()
  }, [selectedCategory, searchQuery, currentPage])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page on new search
    loadAssets()
  }

  // Handle asset selection
  const handleAssetClick = (asset: MediaAsset) => {
    if (onSelect) {
      onSelect(asset)
    } else {
      setSelectedAsset(asset)
      loadAssetUsage(asset.id)
      setDetailsOpen(true)
    }
  }

  // Handle asset deletion
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return

    setIsDeleting(true)
    try {
      const result = await deleteMediaAsset(selectedAsset.id)
      if (result.success) {
        toast({
          title: "Success",
          description: "Media asset deleted successfully",
        })
        setDeleteDialogOpen(false)
        setDetailsOpen(false)
        loadAssets() // Refresh the list
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete media asset",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting media asset:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Calculate total pages
  const totalPages = Math.ceil(totalAssets / itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex w-full gap-2">
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.name} value={category.name}>
                {category.name} ({category.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center p-6">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No media found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery || selectedCategory
                ? "Try changing your search or category filters"
                : "Upload some media to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleAssetClick(asset)}
            >
              <div className="aspect-square bg-muted relative flex items-center justify-center">
                {asset.mime_type.startsWith("image/") ? (
                  <img
                    src={asset.url || "/placeholder.svg"}
                    alt={asset.alt_text || asset.original_filename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{asset.original_filename}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {new Date(asset.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="flex justify-center mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="mx-4 flex items-center text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </Pagination>
      )}

      {/* Asset Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Media Details</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-1/3 h-40 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                  {selectedAsset.mime_type.startsWith("image/") ? (
                    <img
                      src={selectedAsset.url || "/placeholder.svg"}
                      alt={selectedAsset.alt_text || selectedAsset.original_filename}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="sm:w-2/3 space-y-2">
                  <p className="font-medium">{selectedAsset.original_filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedAsset.file_size / 1024 / 1024).toFixed(2)} MB • {selectedAsset.mime_type}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Category:</span> {selectedAsset.category}
                  </p>
                  {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedAsset.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-muted text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Uploaded:</span> {new Date(selectedAsset.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedAsset.alt_text && (
                <div>
                  <p className="text-sm font-medium">Alt Text:</p>
                  <p className="text-sm text-muted-foreground">{selectedAsset.alt_text}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Usage:</p>
                {assetUsage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">This media is not currently in use.</p>
                ) : (
                  <ScrollArea className="h-32 rounded-md border p-2">
                    <ul className="space-y-2">
                      {assetUsage.map((usage) => (
                        <li key={usage.id} className="text-sm">
                          <span className="font-medium capitalize">{usage.entity_type}</span> #{usage.entity_id} -{" "}
                          <span className="italic">{usage.usage_type}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={assetUsage.length > 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this media asset? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAsset} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
