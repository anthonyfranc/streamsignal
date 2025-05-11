"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: { [key: string]: any }) => Promise<{ error: any; data: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshSession: () => Promise<void>
  sessionExpiry: number | null
  isSessionExpiring: boolean
  isRefreshingSession: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null)
  const [isSessionExpiring, setIsSessionExpiring] = useState(false)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const { toast } = useToast()

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      setIsRefreshingSession(true)
      console.log("Refreshing auth session...")
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error("Error refreshing session:", error)
        toast({
          title: "Session refresh failed",
          description: "There was a problem refreshing your session. You may need to log in again.",
          variant: "destructive",
        })
      } else if (data.session) {
        console.log("Session refreshed successfully")
        setSession(data.session)
        setUser(data.session.user)

        // Update session expiry time
        if (data.session.expires_at) {
          setSessionExpiry(data.session.expires_at * 1000)
        }

        // Broadcast session refresh to other tabs
        if (typeof window !== "undefined") {
          localStorage.setItem("session_refreshed", Date.now().toString())
        }
      } else {
        console.warn("No session returned from refresh")
      }
      return data
    } catch (error) {
      console.error("Exception refreshing session:", error)
      throw error
    } finally {
      setIsRefreshingSession(false)
    }
  }

  useEffect(() => {
    // Get session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Set session expiry if available
      if (session?.expires_at) {
        setSessionExpiry(session.expires_at * 1000)
      }

      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event)
      setSession(session)
      setUser(session?.user ?? null)

      // Update session expiry on auth state change
      if (session?.expires_at) {
        setSessionExpiry(session.expires_at * 1000)
      } else {
        setSessionExpiry(null)
      }

      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Monitor session expiry
  useEffect(() => {
    if (!sessionExpiry) {
      setIsSessionExpiring(false)
      return () => {}
    }

    const checkSessionExpiry = () => {
      const now = Date.now()
      const timeUntilExpiry = sessionExpiry - now

      // Consider session expiring if less than 5 minutes remain
      if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
        setIsSessionExpiring(true)
      } else {
        setIsSessionExpiring(false)
      }
    }

    // Check immediately
    checkSessionExpiry()

    // Then check every minute
    const interval = setInterval(checkSessionExpiry, 60 * 1000)

    return () => clearInterval(interval)
  }, [sessionExpiry])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: { [key: string]: any }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    // We don't need to manually create a user profile anymore
    // The database trigger will handle this automatically

    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
    sessionExpiry,
    isSessionExpiring,
    isRefreshingSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
