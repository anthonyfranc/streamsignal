import { AuthTestClient } from "@/components/auth/auth-test-client"

export default function AuthTestPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>
      <AuthTestClient />
    </div>
  )
}
