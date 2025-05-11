"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

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

        // Force a router refresh to update server components
        router.refresh()

        // Make a request to the auth-debug endpoint to verify server-side auth
        try {
          const response = await fetch("/api/auth-debug")
          const debugData = await response.json()
          console.log("Server auth status after refresh:", debugData)
        } catch (e) {
          console.error("Error checking server auth:", e)
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
    const initializeAuth = async () => {
      try {
        setIsLoading(true)
        console.log("Initializing auth...")

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        console.log("Initial session:", !!session)
        setSession(session)
        setUser(session?.user ?? null)

        // Set session expiry if available
        if (session?.expires_at) {
          setSessionExpiry(session.expires_at * 1000)
        }

        // If we have a session but it's close to expiry, refresh it
        if (session && session.expires_at) {
          const expiryTime = session.expires_at * 1000
          const now = Date.now()
          const timeUntilExpiry = expiryTime - now

          // If less than 10 minutes until expiry, refresh
          if (timeUntilExpiry < 10 * 60 * 1000) {
            await refreshSession()
          }
        }

        // Make a request to the auth-debug endpoint to verify server-side auth
        if (session) {
          try {
            const response = await fetch("/api/auth-debug")
            const debugData = await response.json()
            console.log("Server auth status on init:", debugData)

            // If server doesn't recognize auth but we have a session, force a refresh
            if (!debugData.authenticated && session) {
              console.log("Server doesn't recognize auth, forcing refresh...")
              await refreshSession()
            }
          } catch (e) {
            console.error("Error checking server auth:", e)
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event)
      setSession(session)
      setUser(session?.user ?? null)

      // Update session expiry on auth state change
      if (session?.expires_at) {
        setSessionExpiry(session.expires_at * 1000)
      } else {
        setSessionExpiry(null)
      }

      // Force a router refresh to update server components
      router.refresh()

      // For sign in events, make a request to verify server auth
      if (_event === "SIGNED_IN") {
        console.log("User signed in, verifying server auth...")
        // Wait a moment for cookies to be set
        setTimeout(async () => {
          try {
            const response = await fetch("/api/auth-debug")
            const debugData = await response.json()
            console.log("Server auth status after sign in:", debugData)

            // If server doesn't recognize auth, force a refresh
            if (!debugData.authenticated && session) {
              console.log("Server doesn't recognize auth after sign in, forcing refresh...")
              await refreshSession()
            }
          } catch (e) {
            console.error("Error checking server auth:", e)
          }
        }, 500)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

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
    try {
      console.log("Signing in...")
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (!error) {
        console.log("Sign in successful")
        // Force a router refresh to update server components
        router.refresh()

        // Wait a moment for cookies to be set
        setTimeout(async () => {
          try {
            const response = await fetch("/api/auth-debug")
            const debugData = await response.json()
            console.log("Server auth status after sign in:", debugData)
          } catch (e) {
            console.error("Error checking server auth:", e)
          }
        }, 500)
      } else {
        console.error("Sign in error:", error)
      }

      return { error }
    } catch (error) {
      console.error("Sign in exception:", error)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, metadata?: { [key: string]: any }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })

      if (!error) {
        // Force a router refresh to update server components
        router.refresh()
      }

      return { data, error }
    } catch (error) {
      console.error("Sign up error:", error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // Force a router refresh to update server components
      router.refresh()
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error }
    } catch (error) {
      console.error("Reset password error:", error)
      return { error }
    }
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
