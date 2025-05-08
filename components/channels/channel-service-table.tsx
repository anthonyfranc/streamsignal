import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ChannelWithServices } from "@/app/actions/channel-actions"

interface ChannelServiceTableProps {
  services: ChannelWithServices["services"]
}

export function ChannelServiceTable({ services }: ChannelServiceTableProps) {
  // Sort services by price
  const sortedServices = [...services].sort((a, b) => a.monthly_price - b.monthly_price)

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Service</TableHead>
              <TableHead>Monthly Price</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedServices.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                      {service.logo_url ? (
                        <img
                          src={service.logo_url || "/placeholder.svg"}
                          alt={service.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold">{service.name.substring(0, 2)}</span>
                      )}
                    </div>
                    <span className="font-medium">{service.name}</span>
                  </div>
                </TableCell>
                <TableCell>${service.monthly_price.toFixed(2)}/mo</TableCell>
                <TableCell>
                  {service.tier === "premium" ? <Badge>Premium</Badge> : <Badge variant="outline">Standard</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/services/${service.id}`}>View Service</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 bg-gray-50 rounded-md">
        <h3 className="font-medium mb-2">Subscription Information</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>• Prices shown are starting prices and may vary based on selected plan</li>
          <li>• Premium tiers may offer additional benefits like ad-free viewing or higher quality</li>
          <li>• All services offer monthly billing with the option to cancel anytime</li>
          <li>• Some services offer annual plans at a discounted rate</li>
        </ul>
      </div>
    </div>
  )
}
