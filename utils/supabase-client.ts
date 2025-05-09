"use client"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Get the Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a Supabase client specifically for client components
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
