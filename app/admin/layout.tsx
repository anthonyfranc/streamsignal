import type React from "react"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminThemeProvider } from "@/components/admin/theme-provider"
import { checkAdminAuth } from "@/lib/auth"
import { Toaster } from "@/components/ui/toaster"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // In a real application, you would check if the user is authenticated and has admin privileges
  const isAdmin = await checkAdminAuth()

  if (!isAdmin) {
    redirect("/admin/login")
  }

  return (
    <AdminThemeProvider defaultTheme="light">
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-6 overflow-auto">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <Toaster />
    </AdminThemeProvider>
  )
}
