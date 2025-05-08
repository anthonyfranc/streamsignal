"use client"

import { useDrag } from "react-dnd"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StreamingService } from "@/types/streaming"

interface ServiceItemProps {
  service: StreamingService
}

export function ServiceItem({ service }: ServiceItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "SERVICE",
    item: { service },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div ref={drag} className={cn("cursor-grab", isDragging && "opacity-50")}>
      <Card className="hover:bg-accent transition-colors">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
            {service.logo_url ? (
              <img
                src={service.logo_url || "/placeholder.svg"}
                alt={service.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium">{service.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{service.name}</div>
            <div className="text-xs text-muted-foreground">${service.monthly_price.toFixed(2)}/month</div>
          </div>
          <Badge variant="outline" className="ml-auto">
            {service.has_ads ? "Has Ads" : "Ad-Free"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
