import { checkSupabaseConnection } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DiagnosticsPage() {
  const connectionTest = await checkSupabaseConnection()

  // Get environment variable status (without exposing actual values)
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: !!process.env.SUPABASE_JWT_SECRET,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    POSTGRES_USER: !!process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: !!process.env.POSTGRES_PASSWORD,
    POSTGRES_DATABASE: !!process.env.POSTGRES_DATABASE,
    POSTGRES_HOST: !!process.env.POSTGRES_HOST,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Diagnostics</h1>

      <Card>
        <CardHeader>
          <CardTitle>Supabase Connection</CardTitle>
          <CardDescription>Tests the connection to the Supabase database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center">
              <div
                className={`w-4 h-4 rounded-full mr-2 ${connectionTest.success ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="font-medium">Connection Status: {connectionTest.success ? "Connected" : "Failed"}</span>
            </div>
            {!connectionTest.success && <div className="text-red-500 text-sm mt-2">Error: {connectionTest.error}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Checks if required environment variables are set</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(envVars).map(([key, isSet]) => (
              <div key={key} className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 ${isSet ? "bg-green-500" : "bg-red-500"}`}></div>
                <span className="font-medium">
                  {key}: {isSet ? "Set" : "Not Set"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
