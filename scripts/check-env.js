// This script checks for required environment variables at build time
console.log("Checking environment variables...")

const requiredVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]

const missingVars = requiredVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error("Missing required environment variables:")
  missingVars.forEach((varName) => {
    console.error(`- ${varName}`)
  })
  console.error("Please set these environment variables in your Vercel project settings.")
} else {
  console.log("All required environment variables are set.")
  requiredVars.forEach((varName) => {
    const value = process.env[varName]
    console.log(`- ${varName}: ${value ? "✓" : "✗"} (length: ${value ? value.length : 0})`)
  })
}
