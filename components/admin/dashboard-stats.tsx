import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tv, Radio, Users, Link2, TrendingUp, TrendingDown } from "lucide-react"

interface DashboardStatsProps {
  stats: {
    servicesCount: number
    servicesChange: number
    channelsCount: number
    channelsChange: number
    usersCount: number
    usersChange: number
    mappingsCount: number
    mappingsChange: number
    [key: string]: any
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Services"
        value={stats.servicesCount}
        change={stats.servicesChange}
        icon={<Tv className="h-4 w-4" />}
        description="Total streaming services"
      />
      <StatsCard
        title="Total Channels"
        value={stats.channelsCount}
        change={stats.channelsChange}
        icon={<Radio className="h-4 w-4" />}
        description="Available channels"
      />
      <StatsCard
        title="Active Users"
        value={stats.usersCount}
        change={stats.usersChange}
        icon={<Users className="h-4 w-4" />}
        description="Registered users"
      />
      <StatsCard
        title="Mappings"
        value={stats.mappingsCount}
        change={stats.mappingsChange}
        icon={<Link2 className="h-4 w-4" />}
        description="Service-channel connections"
      />
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: number
  change: number
  icon: React.ReactNode
  description: string
}

function StatsCard({ title, value, change, icon, description }: StatsCardProps) {
  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="flex items-center gap-1 text-xs">
          <div className={`flex items-center ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
            <span>
              {Math.abs(change)}
              {typeof change === "number" && !Number.isInteger(change) ? "%" : ""}
            </span>
          </div>
          <p className="text-muted-foreground">from last period</p>
        </div>
        <CardDescription className="pt-1">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
