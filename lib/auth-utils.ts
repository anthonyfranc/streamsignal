import { getSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export async function getUser() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

export async function requireAdmin() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  // Check if user has admin role
  const { data, error } = await getSupabaseServerClient().from("profiles").select("role").eq("id", user.id).single()

  if (error || data?.role !== "admin") {
    redirect("/unauthorized")
  }

  return user
}
