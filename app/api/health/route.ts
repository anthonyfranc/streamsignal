import { NextResponse } from "next/server"
import { checkSupabaseHealth } from "@/lib/supabase-health"

// Declare EdgeRuntime to avoid the "undeclared variable" error.  This is a Next.js specific variable.
declare const EdgeRuntime: string | undefined

export async function GET() {
  try {
    const supabaseHealth = await checkSupabaseHealth()

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseHealth,
      },
      environment: {
        node_env: process.env.NODE_ENV,
        // Use a fallback value instead of relying on NEXT_RUNTIME
        runtime: typeof EdgeRuntime !== "undefined" ? "edge" : "nodejs",
      },
    })
  } catch (error) {
    console.error("Health check error:", error)

    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
