import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/admin/overview"
import { RecentActivity } from "@/components/admin/recent-activity"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { DashboardCharts } from "@/components/admin/dashboard-charts"
import { getAdminStats } from "@/app/actions/admin-actions"
import { requireAdmin } from "@/utils/auth-utils"

export const metadata: Metadata = {
  title: "Admin Dashboard - StreamSignal",
  description: "Admin dashboard for StreamSignal",
}

export default async function AdminDashboard() {
  const user = await requireAdmin()
  const stats = await getAdminStats()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your streaming platform's performance and content.</p>
          <p>Welcome, {user.user_metadata.name || user.email}!</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <select className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <DashboardStats stats={stats} />

          <div className="grid gap-6 md:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>Platform growth over the selected period</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Overview data={stats.overviewData} />
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Recent changes to the database</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <RecentActivity activities={stats.recentActivities} />
              </CardContent>
            </Card>
          </div>

          <DashboardCharts />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Detailed analytics will be available here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground">Analytics dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Generate and view reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center border rounded-md">
                <p className="text-muted-foreground">Reports dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
