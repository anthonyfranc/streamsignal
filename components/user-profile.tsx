import { getUser } from "@/lib/supabase/actions"

export async function UserProfile() {
  const user = await getUser()

  if (!user) {
    return <div>Please sign in to view your profile</div>
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Email: {user.email}</p>
      <p>Name: {user.user_metadata.name}</p>
    </div>
  )
}
