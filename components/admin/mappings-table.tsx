"use client"

import { useState } from "react"
import { MoreHorizontal, Trash, Edit, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"
import type { MappingsFilters } from "./mappings-filter"

interface MappingsTableProps {
  mappings: {
    mapping: ServiceChannel
    service: StreamingService
    channel: Channel
  }[]
  filters?: MappingsFilters
  deleteMappingAction: (serviceId: number, channelId: number) => Promise<{ success: boolean; error?: string }>
  updateMappingTierAction: (
    serviceId: number,
    channelId: number,
    tier: string,
  ) => Promise<{ success: boolean; error?: string }>
}

export function MappingsTable({
  mappings,
  filters = { search: "" },
  deleteMappingAction,
  updateMappingTierAction,
}: MappingsTableProps) {
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [selectedMapping, setSelectedMapping] = useState<{
    serviceId: number
    channelId: number
    serviceName: string
    channelName: string
    currentTier: string
  } | null>(null)
  const [newTier, setNewTier] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!selectedMapping) return

    setIsLoading(true)
    try {
      const result = await deleteMappingAction(selectedMapping.serviceId, selectedMapping.channelId)
      if (result.success) {
        toast({
          title: "Mapping deleted",
          description: `Successfully removed ${selectedMapping.serviceName} from ${selectedMapping.channelName}`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete mapping",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleTierChange = async () => {
    if (!selectedMapping || !newTier) return

    setIsLoading(true)
    try {
      const result = await updateMappingTierAction(selectedMapping.serviceId, selectedMapping.channelId, newTier)
      if (result.success) {
        toast({
          title: "Tier updated",
          description: `Successfully updated ${selectedMapping.serviceName} on ${selectedMapping.channelName} to ${newTier} tier`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update tier",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setTierDialogOpen(false)
    }
  }

  // Filter mappings based on the provided filters
  const filteredMappings = mappings.filter((item) => {
    // Search filter
    if (
      filters.search &&
      !item.service.name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !item.channel.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false
    }

    // Service filter
    if (filters.serviceId !== undefined && item.service.id !== filters.serviceId) {
      return false
    }

    // Channel filter
    if (filters.channelId !== undefined && item.channel.id !== filters.channelId) {
      return false
    }

    // Category filter
    if (filters.category !== undefined && item.channel.category !== filters.category) {
      return false
    }

    // Tier filter
    if (filters.tier !== undefined && item.mapping.tier !== filters.tier) {
      return false
    }

    return true
  })

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>No mappings found</p>
                    {(filters.search || filters.serviceId || filters.channelId || filters.category || filters.tier) && (
                      <p className="text-sm">Try adjusting your filters</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredMappings.map((item) => (
                <TableRow key={`${item.service.id}-${item.channel.id}`}>
                  <TableCell className="font-medium">{item.service.name}</TableCell>
                  <TableCell>{item.channel.name}</TableCell>
                  <TableCell>{item.channel.category}</TableCell>
                  <TableCell>
                    <Badge variant={item.mapping.tier === "premium" ? "default" : "secondary"} className="capitalize">
                      {item.mapping.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMapping({
                              serviceId: item.service.id,
                              channelId: item.channel.id,
                              serviceName: item.service.name,
                              channelName: item.channel.name,
                              currentTier: item.mapping.tier,
                            })
                            setNewTier(item.mapping.tier)
                            setTierDialogOpen(true)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Change tier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setSelectedMapping({
                              serviceId: item.service.id,
                              channelId: item.channel.id,
                              serviceName: item.service.name,
                              channelName: item.channel.name,
                              currentTier: item.mapping.tier,
                            })
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete mapping
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the mapping between{" "}
              <span className="font-semibold">{selectedMapping?.serviceName}</span> and{" "}
              <span className="font-semibold">{selectedMapping?.channelName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Tier</DialogTitle>
            <DialogDescription>
              Update the tier for {selectedMapping?.serviceName} on {selectedMapping?.channelName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="tier" className="text-right text-sm font-medium">
                Tier
              </label>
              <Select value={newTier} onValueChange={setNewTier} disabled={isLoading}>
                <SelectTrigger id="tier" className="col-span-3">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleTierChange} disabled={isLoading || !newTier}>
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
