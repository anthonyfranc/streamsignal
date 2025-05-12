import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import type { Database } from "@/types/database"

// Environment variable validation with better client-side handling
const getEnvVariable = (key: string): string => {
  // For client-side, we need to check if the variable exists
  // and provide a fallback to prevent build errors
  if (typeof window !== "undefined") {
    // We're in the browser
    const value = process.env[key] as string

    // Log the environment variable for debugging (redacted for security)
    if (!value) {
      console.error(`${key} is not available in client-side code`)
    } else {
      console.log(`${key} is available (value length: ${value.length})`)
    }

    return value || ""
  }

  // For server-side, we can be strict
  const value = process.env[key]
  if (!value) {
    console.error(`${key} is required but not provided on server-side`)
    return ""
  }
  return value
}

// Get Supabase URL and anon key with better logging
export const supabaseUrl = (() => {
  const url = getEnvVariable("NEXT_PUBLIC_SUPABASE_URL")
  if (!url && typeof window !== "undefined") {
    console.error("NEXT_PUBLIC_SUPABASE_URL is missing in client-side code")
  }
  return url
})()

export const supabaseAnonKey = (() => {
  const key = getEnvVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if (!key && typeof window !== "undefined") {
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in client-side code")
  }
  return key
})()

// Create a browser client (for client components) with better error handling
export const createBrowserClient = () => {
  // Check if we have the required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing required Supabase environment variables in createBrowserClient")
    console.log(
      "Available env vars:",
      Object.keys(process.env)
        .filter((key) => key.startsWith("NEXT_PUBLIC_"))
        .join(", "),
    )

    // Return a dummy client that will fail gracefully
    return createClient("https://placeholder-url.supabase.co", "placeholder-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }) as any
  }

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
  // We need to dynamically import cookies from next/headers
  // This ensures it's only imported in the App Router
  let cookieStore: any = null

  try {
    // This will throw an error in the Pages Router
    // We'll catch it and provide an alternative
    if (typeof window === "undefined") {
      // Using dynamic import to avoid static analysis
      const getCookies = new Function('return import("next/headers").then(mod => mod.cookies)')
      cookieStore = getCookies()
    }
  } catch (e) {
    // This will happen in the Pages Router
    // We'll provide an alternative below
    console.debug("Could not import cookies from next/headers - this is expected in Pages Router")
  }

  // If we couldn't get cookies from next/headers, return a dummy client
  // This client will only be used during build time in the Pages Router
  if (!cookieStore) {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }

  // Otherwise, return a proper server client
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
  // We need to dynamically import cookies from next/headers
  // This ensures it's only imported in the App Router
  let cookieStore: any = null

  try {
    // This will throw an error in the Pages Router
    // We'll catch it and provide an alternative
    if (typeof window === "undefined") {
      // Using dynamic import to avoid static analysis
      const getCookies = new Function('return import("next/headers").then(mod => mod.cookies)')
      cookieStore = getCookies()
    }
  } catch (e) {
    // This will happen in the Pages Router
    // We'll provide an alternative below
    console.debug("Could not import cookies from next/headers - this is expected in Pages Router")
  }

  // If we couldn't get cookies from next/headers, return a dummy client
  // This client will only be used during build time in the Pages Router
  if (!cookieStore) {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }

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
  // We need to dynamically import cookies from next/headers
  // This ensures it's only imported in the App Router
  let cookieStore: any = null

  try {
    // This will throw an error in the Pages Router
    // We'll catch it and provide an alternative
    if (typeof window === "undefined") {
      // Using dynamic import to avoid static analysis
      const getCookies = new Function('return import("next/headers").then(mod => mod.cookies)')
      cookieStore = getCookies()
    }
  } catch (e) {
    // This will happen in the Pages Router
    // We'll provide an alternative below
    console.debug("Could not import cookies from next/headers - this is expected in Pages Router")
  }

  // If we couldn't get cookies from next/headers, return a dummy client
  // This client will only be used during build time in the Pages Router
  if (!cookieStore) {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }

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
