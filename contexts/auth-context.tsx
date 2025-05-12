"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-singleton"
import type { User, Session } from "@supabase/supabase-js"
import type { ReactNode } from "react"

type AuthState = {
  user: User | null
  session: Session | null
  isLoading: boolean
}

type AuthContextType = AuthState & {
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string, options?: { name?: string }) => Promise<{ error: any | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  })

  // Use the singleton pattern to get the Supabase client
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Get session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: false,
      }))
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: false,
      }))
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, options?: { name?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options?.name ? { name: options.name } : undefined,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    ...state,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
