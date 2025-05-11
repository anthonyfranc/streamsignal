import type { GetServerSidePropsContext } from "next"
import { getPagesUser } from "./pages-auth"

/**
 * Helper function to get the authenticated user in getServerSideProps
 */
export async function withAuth(context: GetServerSidePropsContext) {
  const { user } = await getPagesUser(context)

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    }
  }

  return {
    props: {
      user: {
        id: user.id,
        email: user.email,
      },
    },
  }
}

/**
 * Helper function to get the user in getServerSideProps without redirecting
 */
export async function withUser(context: GetServerSidePropsContext) {
  const { user } = await getPagesUser(context)

  return {
    props: {
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
    },
  }
}
