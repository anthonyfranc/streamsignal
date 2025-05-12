"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createBrowserClient } from "@/utils/supabase-browser"
import type { User, Session } from "@supabase/supabase-js"
import type { ReactNode } from "react"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
})

export function AuthProvider({ children, initialSession }: { children: ReactNode; initialSession: Session | null }) {
  const [user, setUser] = useState<User | null>(initialSession?.user || null)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()

    // Set initial session from props (SSR)
    if (initialSession) {
      setUser(initialSession.user)
      setSession(initialSession)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(newSession?.user || null)
        setSession(newSession)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setSession(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialSession])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
