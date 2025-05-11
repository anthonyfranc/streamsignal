import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

// Universal function that works in both App Router and Pages Router
export async function getServerUser(context?: any) {
  try {
    let supabase

    // Check if we're in API Routes or getServerSideProps (Pages Router)
    if (context && context.req && context.res) {
      // We're in Pages Router
      supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return context.req.cookies[name]
            },
            set(name: string, value: string, options: any) {
              context.res.setHeader(
                "Set-Cookie",
                `${name}=${value}; Path=${options.path || "/"}; ${
                  options.httpOnly ? "HttpOnly;" : ""
                } ${options.secure ? "Secure;" : ""} ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
              )
            },
            remove(name: string, options: any) {
              context.res.setHeader(
                "Set-Cookie",
                `${name}=; Path=${options.path || "/"}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
              )
            },
          },
        },
      )
    } else {
      // We're in App Router or Client Component
      const cookieGetter = () => {
        try {
          // This will work in Server Components when the request is available
          // but will throw an error in Client Components
          const requestCookies = require("@/lib/request-cookies").getCookies()
          return requestCookies
        } catch (e) {
          // We're likely in a Client Component or other context without request access
          return {}
        }
      }

      const cookies = cookieGetter()

      supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookies[name]
            },
            set(name: string, value: string, options: any) {
              // In App Router, we can't set cookies from most Server Components
              console.log(`Cookie set attempted: ${name}`)
            },
            remove(name: string, options: any) {
              // In App Router, we can't remove cookies from most Server Components
              console.log(`Cookie remove attempted: ${name}`)
            },
          },
        },
      )
    }

    // Use getUser() to validate the token
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (err) {
    console.error("Exception in getServerUser:", err)
    return { user: null, error: err }
  }
}

/**
 * Verifies if a user is authenticated on the server
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyServerAuth(context?: any) {
  const { user, error } = await getServerUser(context)

  if (error || !user) {
    return null
  }

  return user.id
}
