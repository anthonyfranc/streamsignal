import { AuthVoteTester } from "@/components/auth/auth-vote-tester"

export default function AuthTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Testing</h1>
      <AuthVoteTester />
    </div>
  )
}
