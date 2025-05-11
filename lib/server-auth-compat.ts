// This is a compatibility layer for the Pages Router
// It doesn't use next/headers which is App Router only
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next"

/**
 * Gets the current authenticated user from the server in Pages Router context
 */
export async function getServerUserInPages(
  context: GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse },
) {
  try {
    console.log("Getting server user in Pages Router context")

    // Create a Supabase client using the context
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
              `${name}=${value}; Path=${options.path || "/"}; ${options.httpOnly ? "HttpOnly;" : ""} ${options.secure ? "Secure;" : ""} ${options.sameSite ? `SameSite=${options.sameSite};` : ""}`,
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
    console.log("Calling supabase.auth.getUser() in Pages context...")
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting server user in Pages:", error.message)
      return { user: null, error }
    }

    console.log("User retrieved successfully in Pages:", !!data.user)
    return { user: data.user, error: null }
  } catch (err) {
    console.error("Exception in getServerUserInPages:", err)
    return { user: null, error: err }
  }
}

/**
 * Verifies if a user is authenticated on the server in Pages Router context
 * Returns the user ID if authenticated, null otherwise
 */
export async function verifyServerAuthInPages(
  context: GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse },
) {
  console.log("Starting verifyServerAuthInPages...")
  const { user, error } = await getServerUserInPages(context)

  if (error) {
    console.error("Auth verification error in Pages:", error)
    return null
  }

  if (!user) {
    console.log("No authenticated user found in Pages")
    return null
  }

  console.log("User authenticated in Pages:", user.id.substring(0, 8) + "...")
  return user.id
}
