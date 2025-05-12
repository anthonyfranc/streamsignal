import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Original getSupabase function that's being imported elsewhere
export function getSupabase() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_ANON_KEY || "")
}

// Modern createClient function using SSR
export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Handle cookies in read-only mode during static rendering
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options })
        } catch (error) {
          // Handle cookies in read-only mode during static rendering
        }
      },
    },
  })
}

// Re-export createClient from supabase-js for compatibility
export { createClient as createSupabaseClient } from "@supabase/supabase-js"
