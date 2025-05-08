import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tv, Package, Layers, Award } from "lucide-react"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"

interface MappingsStatsProps {
  mappings: {
    mapping: ServiceChannel
    service: StreamingService
    channel: Channel
  }[]
  services: StreamingService[]
  channels: Channel[]
}

export function MappingsStats({ mappings, services, channels }: MappingsStatsProps) {
  // Calculate stats
  const totalMappings = mappings.length
  const servicesWithChannels = new Set(mappings.map((m) => m.mapping.service_id)).size
  const channelsWithServices = new Set(mappings.map((m) => m.mapping.channel_id)).size
  const premiumMappings = mappings.filter((m) => m.mapping.tier === "premium").length

  // Calculate coverage percentages
  const servicesCoverage = Math.round((servicesWithChannels / services.length) * 100) || 0
  const channelsCoverage = Math.round((channelsWithServices / channels.length) * 100) || 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMappings}</div>
          <p className="text-xs text-muted-foreground">Service-channel connections</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Services Coverage</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{servicesCoverage}%</div>
          <p className="text-xs text-muted-foreground">
            {servicesWithChannels} of {services.length} services have channels
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Channels Coverage</CardTitle>
          <Tv className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{channelsCoverage}%</div>
          <p className="text-xs text-muted-foreground">
            {channelsWithServices} of {channels.length} channels have services
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Premium Mappings</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{premiumMappings}</div>
          <p className="text-xs text-muted-foreground">
            {Math.round((premiumMappings / totalMappings) * 100) || 0}% of mappings are premium
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
