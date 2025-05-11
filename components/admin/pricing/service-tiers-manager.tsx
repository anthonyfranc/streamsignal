"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2, Edit, MoveUp, MoveDown, BarChart2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { getServiceTiers, deleteServiceTier, updateTierOrder } from "@/app/actions/pricing-actions"
import { isPromotionActive, getEffectivePrice } from "@/types/pricing"
import type { ServiceTier } from "@/types/pricing"
import { ServiceTierDialog } from "./service-tier-dialog"
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
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface ServiceTiersManagerProps {
  serviceId: number
  serviceName: string
}

export function ServiceTiersManager({ serviceId, serviceName }: ServiceTiersManagerProps) {
  const [tiers, setTiers] = useState<ServiceTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentTier, setCurrentTier] = useState<ServiceTier | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tierToDelete, setTierToDelete] = useState<ServiceTier | null>(null)

  // Fetch tiers when component mounts or serviceId changes
  useEffect(() => {
    const fetchTiers = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getServiceTiers(serviceId)
        setTiers(data)
      } catch (err) {
        setError("Failed to load pricing tiers")
        toast({
          title: "Error",
          description: "Failed to load pricing tiers",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTiers()
  }, [serviceId])

  const handleAddTier = () => {
    setCurrentTier(null)
    setIsDialogOpen(true)
  }

  const handleEditTier = (tier: ServiceTier) => {
    setCurrentTier(tier)
    setIsDialogOpen(true)
  }

  const handleDeleteTier = (tier: ServiceTier) => {
    setTierToDelete(tier)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTier = async () => {
    if (!tierToDelete) return

    try {
      const result = await deleteServiceTier(tierToDelete.id, serviceId)
      if (result.success) {
        setTiers(tiers.filter((t) => t.id !== tierToDelete.id))
        toast({
          title: "Success",
          description: `Tier "${tierToDelete.name}" deleted successfully`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete tier",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setTierToDelete(null)
    }
  }

  const handleDialogClose = (newTier?: ServiceTier) => {
    setIsDialogOpen(false)

    if (newTier) {
      // If editing an existing tier, update it in the list
      if (currentTier) {
        setTiers(tiers.map((t) => (t.id === newTier.id ? newTier : t)))
      }
      // If adding a new tier, add it to the list
      else {
        setTiers([...tiers, newTier])
      }
    }
  }

  const moveTier = async (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === tiers.length - 1)) {
      return
    }

    const newIndex = direction === "up" ? index - 1 : index + 1
    const newTiers = [...tiers]
    const tier = newTiers[index]
    newTiers[index] = newTiers[newIndex]
    newTiers[newIndex] = tier

    setTiers(newTiers)

    // Update the order in the database
    try {
      const result = await updateTierOrder(
        serviceId,
        newTiers.map((t) => t.id),
      )

      if (!result.success) {
        // If the update fails, revert the UI change
        toast({
          title: "Error",
          description: result.error || "Failed to update tier order",
          variant: "destructive",
        })

        // Refetch the tiers to ensure UI is in sync with database
        const data = await getServiceTiers(serviceId)
        setTiers(data)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pricing Tiers for {serviceName}</h2>
        <div className="flex space-x-2">
          {tiers.length > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/admin/services/${serviceId}/pricing/comparison`}>
                <BarChart2 className="mr-2 h-4 w-4" />
                Compare Tiers
              </Link>
            </Button>
          )}
          <Button onClick={handleAddTier}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Tier
          </Button>
        </div>
      </div>

      {tiers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
            <p className="text-muted-foreground mb-4">No pricing tiers defined for this service</p>
            <Button onClick={handleAddTier}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tiers.map((tier, index) => (
            <Card key={tier.id} className={tier.is_popular ? "border-primary" : ""}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    {tier.name}
                    {tier.is_popular && <Badge className="ml-2 bg-primary">Popular</Badge>}
                    {isPromotionActive(tier) && <Badge className="ml-2 bg-green-600">On Sale</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {isPromotionActive(tier) ? (
                      <div className="flex items-center gap-2">
                        <span className="line-through">${tier.price.toFixed(2)}</span>
                        <span className="text-green-600 font-medium">${getEffectivePrice(tier).toFixed(2)}/month</span>
                        {tier.promo_description && (
                          <span className="text-xs bg-green-50 text-green-700 px-1 py-0.5 rounded">
                            {tier.promo_description}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>${tier.price.toFixed(2)}/month</>
                    )}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon" disabled={index === 0} onClick={() => moveTier(index, "up")}>
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={index === tiers.length - 1}
                    onClick={() => moveTier(index, "down")}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleEditTier(tier)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDeleteTier(tier)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{tier.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Max Streams:</span> {tier.max_streams}
                  </div>
                  <div>
                    <span className="font-medium">Video Quality:</span> {tier.video_quality}
                  </div>
                  <div>
                    <span className="font-medium">Ads:</span> {tier.has_ads ? "Yes" : "No"}
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Features:</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {tier.features.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceTierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        serviceId={serviceId}
        tier={currentTier}
        onClose={handleDialogClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{tierToDelete?.name}" pricing tier. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTier}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
