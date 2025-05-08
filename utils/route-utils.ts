"use client"

import { usePathname } from "next/navigation"

/**
 * Hook to determine if the current route is an admin route
 * @returns boolean indicating if the current path starts with /admin
 */
export function useIsAdminRoute() {
  const pathname = usePathname()
  return pathname?.startsWith("/admin") || false
}

/**
 * Hook to determine if the current route is the login page
 * to handle special cases for the login page layout
 */
export function useIsLoginPage() {
  const pathname = usePathname()
  return pathname === "/admin/login"
}
