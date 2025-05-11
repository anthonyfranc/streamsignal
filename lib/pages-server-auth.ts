import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import type { NextApiRequest, NextApiResponse } from "next"

// This version is specifically for use in the Pages Router
// It doesn't import next/headers at all

type PagesContext = {
  req: NextApiRequest
  res: NextApiResponse
}

/**
 * Gets the current authenticated user from the server in Pages Router
 */
export async function getPagesServerUser(context: PagesContext) {
  try {
    // Create Supabase client for Pages Router
    const supabase = createServerClient<Database>(
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

    // Use getUser() to validate the token
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user:", error.message)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (err) {
    console.error("Exception in getPagesServerUser:", err)
    return { user: null, error: err }
  }
}

/**
 * Verifies if a user is authenticated on the server in Pages Router
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyPagesServerAuth(context: PagesContext) {
  const { user, error } = await getPagesServerUser(context)

  if (error || !user) {
    return null
  }

  return user.id
}
