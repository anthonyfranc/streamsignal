import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "supabase.auth.token",
    // Explicitly set cookie options
    cookieOptions: {
      // Don't use 'secure: true' for local development without HTTPS
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Don't set domain to allow the browser to automatically use the current domain
    },
  },
})

// Create a Supabase client configured to use cookies for authentication.
export function createServerSupabaseClient() {
  // Ensure we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }

  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not provided")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Create a simple Supabase client for server components
// This maintains backward compatibility with existing code
export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not provided")
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not provided")
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Export a pre-initialized server-side client for convenience
export const supabaseServer = getSupabase()

export async function checkSupabaseConnection() {
  try {
    // Try to create a Supabase client
    const supabase = createServerSupabaseClient()

    // Check if we can connect to Supabase
    const { data, error } = await supabaseServer.from("_health_check").select("*").limit(1)

    if (error) {
      return {
        success: false,
        error: `Database connection error: ${error.message}`,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
