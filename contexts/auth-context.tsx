"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { syncAuthState } from "@/app/actions/auth-sync-actions"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: { [key: string]: any }) => Promise<{ error: any; data: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshSession: () => Promise<{ success: boolean; error?: any; session?: Session }>
  getSession: () => Promise<{ success: boolean; session?: Session; error?: any }>
  syncWithServer: () => Promise<{ success: boolean; error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(0)

  // Use refs to track initialization and prevent duplicate work
  const isInitializedRef = useRef(false)
  const initializationInProgressRef = useRef(false)
  const authStateChangeCount = useRef(0)

  // Add refs to prevent recursive loops
  const isSyncingRef = useRef(false)
  const isGettingSessionRef = useRef(false)
  const pendingStateUpdatesRef = useRef(0)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Function to safely update session state with debouncing
  const updateSessionState = (newSession: Session | null) => {
    // Increment pending updates counter
    pendingStateUpdatesRef.current += 1

    // Only update if the session has actually changed
    const sessionChanged =
      (!session && newSession) ||
      (session && !newSession) ||
      (session && newSession && session.access_token !== newSession.access_token)

    if (sessionChanged) {
      console.log("Updating session state:", !!newSession)
      setSession(newSession)
      setUser(newSession?.user ?? null)
    } else {
      console.log("Session unchanged, skipping update")
    }

    // Decrement pending updates counter
    setTimeout(() => {
      pendingStateUpdatesRef.current -= 1
    }, 0)
  }

  // Function to synchronize client auth state with server
  const syncWithServer = async () => {
    // Prevent recursive calls and debounce
    if (isSyncingRef.current) {
      console.log("Sync already in progress, skipping")
      return { success: false, error: "Sync already in progress" }
    }

    // Clear any pending sync timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }

    // Set syncing flag
    isSyncingRef.current = true

    try {
      console.log("Synchronizing auth state with server...")
      const serverAuthState = await syncAuthState()

      if (serverAuthState.authenticated) {
        console.log("Server confirms authentication is valid")

        // If we don't have a session locally but server says we're authenticated,
        // we should refresh our local session, but only if we're not already getting it
        if (!session && !isGettingSessionRef.current) {
          console.log("Local session missing but server session exists, refreshing local state")
          await getSession()
        }

        return { success: true }
      } else {
        console.warn("Server reports no valid authentication:", serverAuthState.error)

        // If server says we're not authenticated but we have a local session,
        // our local state is out of sync
        if (session) {
          console.log("Local session exists but server session missing, clearing local state")
          updateSessionState(null)
        }

        return { success: false, error: serverAuthState.error }
      }
    } catch (error) {
      console.error("Error synchronizing with server:", error)
      return { success: false, error }
    } finally {
      // Set a timeout before allowing another sync
      syncTimeoutRef.current = setTimeout(() => {
        isSyncingRef.current = false
      }, 2000) // 2 second cooldown
    }
  }

  // Function to get the current session
  const getSession = async () => {
    // Prevent recursive calls
    if (isGettingSessionRef.current) {
      console.log("Get session already in progress, skipping")
      return { success: false, error: "Get session already in progress" }
    }

    isGettingSessionRef.current = true

    try {
      console.log("Getting current auth session...")
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Error getting session:", error)
        return { success: false, error }
      }

      if (data.session) {
        console.log("Session retrieved successfully")
        updateSessionState(data.session)
        return { success: true, session: data.session }
      } else {
        console.warn("No active session found")
        // Clear local state if no session exists
        updateSessionState(null)
        return { success: false, error: "No active session" }
      }
    } catch (error) {
      console.error("Exception getting session:", error)
      return { success: false, error }
    } finally {
      // Allow a small delay before allowing another getSession call
      setTimeout(() => {
        isGettingSessionRef.current = false
      }, 1000)
    }
  }

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      // Prevent excessive refreshes (no more than once every 5 seconds)
      const now = Date.now()
      if (now - lastRefresh < 5000) {
        console.log("Skipping refresh - too soon since last refresh")
        return { success: false, error: "Too many refresh attempts" }
      }

      setLastRefresh(now)
      console.log("Refreshing auth session...")

      // First check if we have a session
      if (!session) {
        console.warn("Cannot refresh - no active session")
        return { success: false, error: "No active session to refresh" }
      }

      // Now try to refresh
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        // Handle specific error for missing session
        if (error.message && error.message.includes("Auth session missing")) {
          console.warn("Auth session missing, clearing local state")
          updateSessionState(null)
          return { success: false, error: "Session expired" }
        }

        console.error("Error refreshing session:", error)
        return { success: false, error }
      }

      if (data.session) {
        console.log("Session refreshed successfully")
        updateSessionState(data.session)
        return { success: true, session: data.session }
      } else {
        console.warn("No session returned after refresh")
        // Clear local state if refresh didn't return a session
        updateSessionState(null)
        return { success: false, error: "No session returned" }
      }
    } catch (error) {
      console.error("Exception refreshing session:", error)
      return { success: false, error }
    }
  }

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current || initializationInProgressRef.current) {
      console.log("Auth already initialized or initialization in progress, skipping")
      return
    }

    // Mark initialization as in progress
    initializationInProgressRef.current = true

    // Get session from storage on initial load
    const initializeAuth = async () => {
      try {
        console.log("Starting auth initialization...")
        setIsLoading(true)
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting initial session:", error)
        } else if (data.session) {
          console.log("Initial session loaded")
          updateSessionState(data.session)
        } else {
          console.log("No initial session found")
        }

        // Mark initialization as complete
        isInitializedRef.current = true
      } catch (error) {
        console.error("Exception during auth initialization:", error)
      } finally {
        initializationInProgressRef.current = false
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      authStateChangeCount.current += 1
      console.log(`Auth state changed (${authStateChangeCount.current}): ${_event}, session: ${!!newSession}`)

      // Update session state
      updateSessionState(newSession)
      setIsLoading(false)

      // Don't trigger server sync on every auth state change to prevent loops
      // Only sync on specific events that indicate a meaningful change
      if ((_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") && !isSyncingRef.current) {
        // Add a small delay to allow state updates to process
        setTimeout(() => {
          syncWithServer()
        }, 500)
      }
    })

    // Set up a timer to refresh the session periodically if one exists
    const refreshTimer = setInterval(
      async () => {
        if (session && !isSyncingRef.current && !isGettingSessionRef.current) {
          console.log("Periodic session refresh")
          await refreshSession()
        }
      },
      10 * 60 * 1000,
    ) // Every 10 minutes

    return () => {
      console.log("Cleaning up auth subscriptions")
      subscription.unsubscribe()
      clearInterval(refreshTimer)

      // Clear any pending timeouts
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, []) // Empty dependency array to ensure this only runs once

  // Add page focus listener to refresh session when user returns to tab
  useEffect(() => {
    const handleFocus = async () => {
      // Skip if we're already syncing or getting a session
      if (isSyncingRef.current || isGettingSessionRef.current) {
        console.log("Focus detected, but auth operations already in progress")
        return
      }

      console.log("Window focus detected, checking session...")

      // Only try to refresh if we think we have a session
      if (session) {
        await refreshSession()
      } else {
        // If we don't think we have a session, just check
        await getSession()
      }
    }

    // Only add listener in browser environment
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus)

      return () => {
        window.removeEventListener("focus", handleFocus)
      }
    }
  }, [session])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (!error && data.session) {
        updateSessionState(data.session)
      }

      return { error }
    } catch (error) {
      console.error("Sign in error:", error)
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

      return { data, error }
    } catch (error) {
      console.error("Sign up error:", error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // Clear local state
      updateSessionState(null)
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
    getSession,
    syncWithServer,
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
