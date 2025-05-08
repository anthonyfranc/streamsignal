"use client"

import { useState } from "react"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { StreamingService, Channel } from "@/types/streaming"

interface MappingListProps {
  mappings: {
    key: string
    service: StreamingService
    channel: Channel
    tier: string
  }[]
  onDelete: (serviceId: number, channelId: number) => void
  onUpdateTier: (serviceId: number, channelId: number, tier: string) => void
}

export function MappingList({ mappings, onDelete, onUpdateTier }: MappingListProps) {
  const [tierDialogOpen, setTierDialogOpen] = useState(false)
  const [selectedMapping, setSelectedMapping] = useState<{
    serviceId: number
    channelId: number
    serviceName: string
    channelName: string
    currentTier: string
  } | null>(null)
  const [newTier, setNewTier] = useState<string>("")

  const handleOpenTierDialog = (mapping: (typeof mappings)[0]) => {
    setSelectedMapping({
      serviceId: mapping.service.id,
      channelId: mapping.channel.id,
      serviceName: mapping.service.name,
      channelName: mapping.channel.name,
      currentTier: mapping.tier,
    })
    setNewTier(mapping.tier)
    setTierDialogOpen(true)
  }

  const handleUpdateTier = () => {
    if (!selectedMapping || !newTier) return

    onUpdateTier(selectedMapping.serviceId, selectedMapping.channelId, newTier)
    setTierDialogOpen(false)
  }

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
            {mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No mappings have been created yet.
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.key}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                        {mapping.service.logo_url ? (
                          <img
                            src={mapping.service.logo_url || "/placeholder.svg"}
                            alt={mapping.service.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {mapping.service.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span>{mapping.service.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                        {mapping.channel.logo_url ? (
                          <img
                            src={mapping.channel.logo_url || "/placeholder.svg"}
                            alt={mapping.channel.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {mapping.channel.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span>{mapping.channel.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{mapping.channel.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mapping.tier === "premium" ? "default" : "secondary"} className="capitalize">
                      {mapping.tier}
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
                        <DropdownMenuItem onClick={() => handleOpenTierDialog(mapping)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Change tier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(mapping.service.id, mapping.channel.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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

      {/* Tier Edit Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tier</DialogTitle>
            <DialogDescription>
              Update the tier for {selectedMapping?.serviceName} on {selectedMapping?.channelName}
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={newTier} onValueChange={setNewTier} className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="edit-standard" />
              <Label htmlFor="edit-standard" className="cursor-pointer">
                Standard
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="premium" id="edit-premium" />
              <Label htmlFor="edit-premium" className="cursor-pointer">
                Premium
              </Label>
            </div>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTier}>Update Tier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
