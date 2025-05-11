"use client"

import { useState } from "react"
import { PlusCircle, Pencil, Trash2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
import { toast } from "@/components/ui/use-toast"
import { AddonServiceForm } from "./addon-service-form"
import type { AddonService } from "@/types/streaming"
import { createAddonService, updateAddonService, deleteAddonService } from "@/app/actions/content-admin-actions"
import { FallbackImage } from "@/components/ui/fallback-image"

interface AddonServicesManagerProps {
  serviceId: number
  addons: AddonService[]
}

export function AddonServicesManager({ serviceId, addons }: AddonServicesManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAddon, setSelectedAddon] = useState<AddonService | null>(null)
  const [addonsState, setAddonsState] = useState<AddonService[]>(addons)

  const handleAddAddon = async (data: Omit<AddonService, "id" | "created_at">) => {
    const result = await createAddonService(data)

    if (result.success && result.id) {
      // Add the new addon to the state with the service details
      // Note: We'll need to fetch the service details to display properly
      const newAddon: AddonService = {
        ...data,
        id: result.id,
        created_at: new Date().toISOString(),
        // We'll need to add the addon_service details from the form data
        addon_service: {
          id: data.addon_service_id,
          name: "Loading...", // This will be replaced on page refresh
          logo_url: null,
          description: null,
        },
      }

      setAddonsState((prev) => [...prev, newAddon])

      // Close the dialog
      setIsAddDialogOpen(false)
    }

    return result
  }

  const handleEditAddon = async (data: Omit<AddonService, "id" | "created_at">) => {
    if (!selectedAddon) return { success: false, error: "No add-on service selected" }
    const result = await updateAddonService(selectedAddon.id, data)

    if (result.success) {
      // Update the addon in state
      setAddonsState((prev) =>
        prev.map((addon) =>
          addon.id === selectedAddon.id
            ? {
                ...addon,
                ...data,
                // Preserve the addon_service details
                addon_service: addon.addon_service,
              }
            : addon,
        ),
      )

      // Close the dialog
      setIsEditDialogOpen(false)
      setSelectedAddon(null)
    }

    return result
  }

  const handleDeleteAddon = async () => {
    if (!selectedAddon) return
    try {
      const result = await deleteAddonService(selectedAddon.id)
      if (result.success) {
        // Update local state by removing the deleted addon
        setAddonsState((prevAddons) => prevAddons.filter((addon) => addon.id !== selectedAddon.id))

        toast({
          title: "Success",
          description: "Add-on service deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete add-on service.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setSelectedAddon(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Add-on Services</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Add-on
        </Button>
      </div>

      {addonsState.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Add-on Services</h3>
            <p className="text-sm text-gray-500 mb-4">
              This service doesn't have any add-on services yet. Add an add-on service to enhance your offering.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>Add First Add-on</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addonsState.map((addon) => (
            <Card key={addon.id} className="overflow-hidden">
              <div className="flex items-center p-4 border-b">
                {addon.addon_service?.logo_url && (
                  <div className="h-10 w-10 mr-3 overflow-hidden rounded-md border bg-gray-50">
                    <FallbackImage
                      src={addon.addon_service.logo_url}
                      alt={addon.addon_service.name || "Add-on service"}
                      width={40}
                      height={40}
                      className="h-full w-full object-contain"
                      entityName={addon.addon_service.name || "Add-on"}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium truncate">{addon.addon_service?.name || "Unknown Service"}</h3>
                  <p className="text-sm text-gray-500">+${addon.price_addition.toFixed(2)}/month</p>
                </div>
                <div className="flex space-x-1 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedAddon(addon)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedAddon(addon)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 pt-3 text-sm">
                {addon.addon_service?.description ? (
                  <p className="line-clamp-2 text-gray-600">{addon.addon_service.description}</p>
                ) : (
                  <p className="text-gray-400 italic">No description available</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Add-on Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Add-on Service</DialogTitle>
            <DialogDescription>Add an add-on service to this streaming service.</DialogDescription>
          </DialogHeader>
          <AddonServiceForm
            parentServiceId={serviceId}
            onSubmit={handleAddAddon}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Add-on Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Add-on Service</DialogTitle>
            <DialogDescription>Update the details of this add-on service.</DialogDescription>
          </DialogHeader>
          {selectedAddon && (
            <AddonServiceForm
              parentServiceId={serviceId}
              addon={selectedAddon}
              onSubmit={handleEditAddon}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Add-on Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Add-on Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedAddon?.addon_service?.name || "this add-on service"}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAddon}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
