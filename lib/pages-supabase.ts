import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import type { Database } from "@/types/database"
import type { NextApiRequest, NextApiResponse } from "next"

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a client for Pages API routes
export function createPagesAPIClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        res.setHeader(
          "Set-Cookie",
          `${name}=${value}; Path=${options.path || "/"}; ${
            options.httpOnly ? "HttpOnly;" : ""
          } ${options.secure ? "Secure;" : ""} ${
            options.expires ? `Expires=${options.expires.toUTCString()};` : ""
          } ${options.maxAge ? `Max-Age=${options.maxAge};` : ""} ${
            options.domain ? `Domain=${options.domain};` : ""
          } ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
        )
      },
      remove(name: string, options: CookieOptions) {
        res.setHeader(
          "Set-Cookie",
          `${name}=; Path=${options.path || "/"}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${
            options.httpOnly ? "HttpOnly;" : ""
          } ${options.secure ? "Secure;" : ""} ${
            options.domain ? `Domain=${options.domain};` : ""
          } ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
        )
      },
    },
  })
}

// Create a client for getServerSideProps
export function createPagesSSRClient(req: any, res: any) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        res.setHeader(
          "Set-Cookie",
          `${name}=${value}; Path=${options.path || "/"}; ${
            options.httpOnly ? "HttpOnly;" : ""
          } ${options.secure ? "Secure;" : ""} ${
            options.expires ? `Expires=${options.expires.toUTCString()};` : ""
          } ${options.maxAge ? `Max-Age=${options.maxAge};` : ""} ${
            options.domain ? `Domain=${options.domain};` : ""
          } ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
        )
      },
      remove(name: string, options: CookieOptions) {
        res.setHeader(
          "Set-Cookie",
          `${name}=; Path=${options.path || "/"}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${
            options.httpOnly ? "HttpOnly;" : ""
          } ${options.secure ? "Secure;" : ""} ${
            options.domain ? `Domain=${options.domain};` : ""
          } ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
        )
      },
    },
  })
}

// Create a browser client
export const createBrowserClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

// Create a singleton instance of the Supabase client for the browser
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export const pagesSupabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient()
  }
  return supabaseInstance
})()
