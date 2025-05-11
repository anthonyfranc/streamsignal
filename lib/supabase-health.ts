import { createServerSupabaseClient } from "./supabase-ssr"

export async function checkSupabaseHealth() {
  try {
    // Try to create a Supabase client
    const supabase = createServerSupabaseClient()

    // Check if we can connect to Supabase
    const { data, error } = await supabase.from("_health_check").select("*").limit(1)

    if (error) {
      return {
        status: "error",
        message: `Database connection error: ${error.message}`,
        details: error,
      }
    }

    // Check auth system
    const { data: authData, error: authError } = await supabase.auth.getSession()

    if (authError) {
      return {
        status: "warning",
        message: `Auth system error: ${authError.message}`,
        details: {
          auth: authError,
          database: "ok",
        },
      }
    }

    return {
      status: "healthy",
      message: "Supabase connection is healthy",
      details: {
        database: "ok",
        auth: "ok",
        session: authData.session ? "present" : "absent",
      },
    }
  } catch (error) {
    return {
      status: "critical",
      message: `Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}`,
      details: error,
    }
  }
}
