import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

export async function getServerSupabase() {
  const cookieStore = cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: (name) => {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  return supabase
}

export async function getUser() {
  const supabase = await getServerSupabase()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.error("Auth error or no user:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export async function getSession() {
  const supabase = await getServerSupabase()

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      console.error("Session error or no session:", error)
      return null
    }

    return session
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}
