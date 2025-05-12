"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Database } from "@/types/database"

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = createServerActionClient<Database>({ cookies })

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string

  const supabase = createServerActionClient<Database>({ cookies })

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: "Check your email for the confirmation link." }
}

export async function signOut() {
  const supabase = createServerActionClient<Database>({ cookies })
  await supabase.auth.signOut()
  redirect("/")
}

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string

  const supabase = createServerActionClient<Database>({ cookies })

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: "Check your email for the password reset link." }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string

  const supabase = createServerActionClient<Database>({ cookies })

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: "Password updated successfully." }
}
