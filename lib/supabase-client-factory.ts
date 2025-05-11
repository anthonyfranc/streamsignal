import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

// Environment variable validation
const getEnvVariable = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} is required but not provided`)
  }
  return value
}

// Get Supabase URL and anon key
export const supabaseUrl = getEnvVariable("NEXT_PUBLIC_SUPABASE_URL")
export const supabaseAnonKey = getEnvVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY")

// Type for cookie handlers
type CookieHandler = {
  get: (name: string) => string | undefined
  set: (name: string, value: string, options: CookieOptions) => void
  remove: (name: string, options: CookieOptions) => void
}

// Create a browser client (for client components)
export const createBrowserClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

// Create a server client with cookie handling
export const createServerComponentClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Expected error in Server Components
          console.debug("Cannot set cookie in Server Component - this is expected")
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete({ name, ...options })
        } catch (error) {
          // Expected error in Server Components
          console.debug("Cannot delete cookie in Server Component - this is expected")
        }
      },
    },
  })
}

// Create a middleware client
export const createMiddlewareClient = (request: Request, response: Response) => {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const cookies = new Map(
          request.headers
            .get("cookie")
            ?.split(";")
            .map((cookie) => {
              const [key, ...value] = cookie.split("=")
              return [key.trim(), value.join("=")]
            }) || [],
        )
        return cookies.get(name)
      },
      set(name: string, value: string, options: CookieOptions) {
        // This properly sets cookies in the response
        response.headers.append(
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
        // To remove a cookie, set it with an expiration date in the past
        response.headers.append(
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

// Create a server action client
export const createServerActionClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Expected error in Server Actions
          console.debug("Cannot set cookie in Server Action - this is expected")
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete({ name, ...options })
        } catch (error) {
          // Expected error in Server Actions
          console.debug("Cannot delete cookie in Server Action - this is expected")
        }
      },
    },
  })
}

// Create an API route client
export const createRouteHandlerClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete({ name, ...options })
      },
    },
  })
}
