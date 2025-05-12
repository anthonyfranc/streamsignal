import { requireAuth } from "@/utils/auth-utils"
import { UserProfile } from "@/components/auth/user-profile"

export default async function ProfilePage() {
  const user = await requireAuth()

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <UserProfile />
      </div>
    </div>
  )
}
