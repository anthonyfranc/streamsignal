import { createServerClient } from "@/utils/supabase-server"
import { redirect } from "next/navigation"

export async function getUser() {
  const supabase = createServerClient()

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
  const { data: profile } = await createServerClient().from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    redirect("/")
  }

  return user
}
