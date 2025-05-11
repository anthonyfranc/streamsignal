import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next"

// This file is specifically for use in the Pages Router
// It does NOT use next/headers which is App Router only

type PagesContext = GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse }

/**
 * Creates a Supabase client for use in Pages Router
 */
export function createPagesSupabaseClient(context: PagesContext) {
  return createServerClient<Database>(
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
}

/**
 * Gets the current authenticated user from the server in Pages Router
 */
export async function getPagesUser(context: PagesContext) {
  try {
    const supabase = createPagesSupabaseClient(context)
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting user in Pages Router:", error.message)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (err) {
    console.error("Exception in getPagesUser:", err)
    return { user: null, error: err }
  }
}

/**
 * Verifies if a user is authenticated in Pages Router
 */
export async function verifyPagesAuth(context: PagesContext) {
  const { user, error } = await getPagesUser(context)

  if (error || !user) {
    return null
  }

  return user.id
}
