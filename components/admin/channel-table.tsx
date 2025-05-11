"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, MoreHorizontal, ArrowUpDown, ChevronDown, Edit, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { BulkEditChannelDialog } from "./bulk-edit-channel-dialog"
import type { Channel } from "@/types/streaming"

interface ChannelTableProps {
  channels: Channel[]
  deleteChannelAction: (id: number) => Promise<{ success: boolean; error?: string }>
  bulkDeleteChannelsAction: (ids: number[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  bulkUpdateChannelsAction: (
    ids: number[],
    updates: Partial<Channel>,
  ) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
}

export function ChannelTable({
  channels,
  deleteChannelAction,
  bulkDeleteChannelsAction,
  bulkUpdateChannelsAction,
}: ChannelTableProps) {
  const router = useRouter()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<keyof Channel>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Bulk operations state
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([])
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Filter and sort channels
  const filteredChannels = useMemo(() => {
    return channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.category.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [channels, searchQuery])

  const sortedChannels = useMemo(() => {
    return [...filteredChannels].sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return sortOrder === "asc" ? -1 : 1
      if (a[sortBy] > b[sortBy]) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [filteredChannels, sortBy, sortOrder])

  const isAllSelected =
    filteredChannels.length > 0 &&
    filteredChannels.every((channel) => selectedChannels.some((c) => c.id === channel.id))

  // Get unique categories for bulk edit dialog
  const categories = [...new Set(channels.map((channel) => channel.category))].sort()

  const handleDelete = async () => {
    if (!channelToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteChannelAction(channelToDelete.id)

      if (result.success) {
        toast({
          title: "Channel deleted",
          description: `${channelToDelete.name} has been deleted successfully.`,
        })
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete channel.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setChannelToDelete(null)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedChannels.length) return

    setIsBulkDeleting(true)
    try {
      const result = await bulkDeleteChannelsAction(selectedChannels.map((channel) => channel.id))

      if (result.success) {
        toast({
          title: "Channels deleted",
          description: `${result.deletedCount} channels have been deleted successfully.`,
        })
        setSelectedChannels([])
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete channels.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsBulkDeleting(false)
      setIsBulkDeleteDialogOpen(false)
    }
  }

  const handleBulkUpdate = async (ids: number[], updates: Partial<Channel>) => {
    try {
      const result = await bulkUpdateChannelsAction(ids, updates)

      if (result.success) {
        toast({
          title: "Channels updated",
          description: `${result.updatedCount} channels have been updated successfully.`,
        })
        setSelectedChannels([])
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update channels.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleSort = (column: keyof Channel) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedChannels(filteredChannels)
    } else {
      setSelectedChannels([])
    }
  }

  const handleSelectChannel = (checked: boolean, channel: Channel) => {
    if (checked) {
      setSelectedChannels([...selectedChannels, channel])
    } else {
      setSelectedChannels(selectedChannels.filter((c) => c.id !== channel.id))
    }
  }

  return (
    <>
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex items-center space-x-2">
                <Checkbox checked={true} disabled />
                <span>Name</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex items-center space-x-2">
                <Checkbox checked={true} disabled />
                <span>Category</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex items-center space-x-2">
                <Checkbox checked={true} disabled />
                <span>Popularity</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedChannels.length > 0 && (
        <div className="bg-muted/50 p-2 mb-4 rounded-md flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">{selectedChannels.length}</span> of{" "}
            <span className="font-medium">{channels.length}</span> channels selected
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8" onClick={() => setIsBulkEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Bulk Edit
            </Button>
            <Button size="sm" variant="destructive" className="h-8" onClick={() => setIsBulkDeleteDialogOpen(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Select all channels" />
              </TableHead>
              <TableHead className="w-[80px]">Logo</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 p-0 font-medium"
                >
                  Name
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("category")}
                  className="flex items-center gap-1 p-0 font-medium"
                >
                  Category
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("popularity")}
                  className="flex items-center gap-1 p-0 font-medium"
                >
                  Popularity
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChannels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchQuery ? "No channels found matching your search." : "No channels found."}
                </TableCell>
              </TableRow>
            ) : (
              sortedChannels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedChannels.some((c) => c.id === channel.id)}
                      onCheckedChange={(checked) => handleSelectChannel(checked as boolean, channel)}
                      aria-label={`Select ${channel.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {channel.logo_url ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={channel.logo_url || "/placeholder.svg"}
                            alt={`${channel.name} logo`}
                            className="max-h-full max-w-full object-contain"
                            style={{ maxWidth: "100%", maxHeight: "100%" }}
                            onError={(e) => {
                              // Fallback if image fails to load
                              ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=40&width=40"
                              ;(e.target as HTMLImageElement).alt = channel.name.substring(0, 2)
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold">{channel.name.substring(0, 2)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{channel.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{channel.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full max-w-24 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${channel.popularity}%` }} />
                      </div>
                      <span className="text-xs">{channel.popularity}/100</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/channels/${channel.id}`} target="_blank">
                            View on site
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/channels/edit/${channel.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setChannelToDelete(channel)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{sortedChannels.length}</span> of{" "}
          <span className="font-medium">{channels.length}</span> channels
        </div>
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      </div>

      {/* Single delete dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {channelToDelete?.name} and remove all associated data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete multiple channels?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedChannels.length} channels and remove all associated data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBulkDeleting ? "Deleting..." : "Delete Channels"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk edit dialog */}
      <BulkEditChannelDialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        selectedChannels={selectedChannels}
        categories={categories}
        onBulkUpdate={handleBulkUpdate}
      />
    </>
  )
}
