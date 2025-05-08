"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Layers, LayoutDashboard, Settings, Tv, Users, ImageIcon, FileText, Network } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AdminSidebar({ className }: SidebarNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      match: (path: string) => path === "/admin",
    },
    {
      title: "Services",
      href: "/admin/services",
      icon: <Tv className="mr-2 h-4 w-4" />,
      match: (path: string) => path.startsWith("/admin/services"),
    },
    {
      title: "Channels",
      href: "/admin/channels",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      match: (path: string) => path.startsWith("/admin/channels"),
    },
    {
      title: "Mappings",
      href: "/admin/mappings",
      icon: <Layers className="mr-2 h-4 w-4" />,
      match: (path: string) => path === "/admin/mappings",
    },
    {
      title: "Visual Mapping",
      href: "/admin/mappings/visual",
      icon: <Network className="mr-2 h-4 w-4" />,
      match: (path: string) => path === "/admin/mappings/visual",
    },
    {
      title: "Media Library",
      href: "/admin/media",
      icon: <ImageIcon className="mr-2 h-4 w-4" />,
      match: (path: string) => path === "/admin/media",
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: <Users className="mr-2 h-4 w-4" />,
      match: (path: string) => path === "/admin/users",
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: <FileText className="mr-2 h-4 w-4" />,
      match: (path: string) => path === "/admin/reports",
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
      match: (path: string) => path === "/admin/settings",
    },
  ]

  return (
    <div className={cn("w-64 flex-shrink-0 border-r border-gray-200 bg-white", className)}>
      <div className="flex h-full flex-col py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">Admin Dashboard</h2>
          <ScrollArea className="h-[calc(100vh-6rem)]">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={item.match(pathname) ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    {item.icon}
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
