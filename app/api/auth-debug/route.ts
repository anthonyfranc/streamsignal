import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getServerUser } from "@/lib/server-auth"
import { createServerClient } from "@supabase/ssr"

export async function GET() {
  try {
    // Get all cookies for debugging
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll().map((c) => ({
      name: c.name,
      // Only show first few chars of value for security
      value: c.value.substring(0, 5) + "...",
      path: c.path,
      expires: c.expires,
    }))

    // Check auth state using our getServerUser function
    const { user, error } = await getServerUser()

    // Also check directly with Supabase for comparison
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Expected error in Server Components
              console.debug("Cannot set cookie in API route - this is normal")
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.delete({ name, ...options })
            } catch (error) {
              // Expected error in Server Components
              console.debug("Cannot delete cookie in API route - this is normal")
            }
          },
        },
      },
    )

    const { data: userData } = await supabase.auth.getUser()
    const { data: sessionData } = await supabase.auth.getSession()

    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id ? user.id.substring(0, 8) + "..." : null,
      error: error ? error.message : null,
      cookieCount: allCookies.length,
      authCookiePresent: allCookies.some((c) => c.name.includes("-auth-")),
      cookies: allCookies,
      directCheck: {
        userPresent: !!userData.user,
        sessionPresent: !!sessionData.session,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
