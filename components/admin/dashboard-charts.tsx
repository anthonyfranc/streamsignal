import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryDistribution } from "@/components/admin/category-distribution"
import { PopularityChart } from "@/components/admin/popularity-chart"

export function DashboardCharts() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Channel Categories</CardTitle>
          <CardDescription>Distribution of channels by category</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryDistribution />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Popularity</CardTitle>
          <CardDescription>Top channels by popularity rating</CardDescription>
        </CardHeader>
        <CardContent>
          <PopularityChart />
        </CardContent>
      </Card>
    </div>
  )
}
