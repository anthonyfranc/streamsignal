import type { GetServerSidePropsContext } from "next"
import { getPagesServerUser } from "@/lib/pages-server-auth"

export async function withAuth(context: GetServerSidePropsContext, callback: (userId: string | null) => Promise<any>) {
  try {
    const { req, res } = context
    const { user } = await getPagesServerUser({ req, res })

    return callback(user?.id || null)
  } catch (error) {
    console.error("Error in withAuth:", error)
    return {
      props: {
        error: "Authentication error",
        user: null,
      },
    }
  }
}
