"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabaseBrowser } from "@/lib/supabase-client"
import type { Session, User } from "@supabase/supabase-js"

type AuthContextType = {
  session: Session | null
  user: User | null
  userProfile: any | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  isLoading: true,
  signOut: async () => {},
  refreshSession: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)

  // Function to fetch user profile - memoized to prevent unnecessary refetches
  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!userId) return null

    try {
      const { data, error } = await supabaseBrowser.from("user_profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching user profile:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Exception fetching user profile:", error)
      return null
    }
  }, [])

  // Function to refresh the session and user data
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (error) {
        console.error("Error refreshing session:", error)
        setSession(null)
        setUser(null)
        setUserProfile(null)
        return
      }

      const currentSession = data.session

      if (currentSession?.user) {
        setSession(currentSession)
        setUser(currentSession.user)

        // Only fetch profile if we don't already have it for this user
        if (!userProfile || userProfile.user_id !== currentSession.user.id) {
          const profile = await fetchUserProfile(currentSession.user.id)
          setUserProfile(profile)
        }
      } else {
        setSession(null)
        setUser(null)
        setUserProfile(null)
      }
    } catch (error) {
      console.error("Exception refreshing session:", error)
      // Reset state on error
      setSession(null)
      setUser(null)
      setUserProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [fetchUserProfile, userProfile])

  // Initialize auth state
  useEffect(() => {
    if (authInitialized) return

    let mounted = true
    setIsLoading(true)

    // Immediately check for session
    const initAuth = async () => {
      try {
        // First check if we have a session
        const { data, error } = await supabaseBrowser.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error("Error getting initial session:", error)
          setIsLoading(false)
          setAuthInitialized(true)
          return
        }

        const currentSession = data.session

        if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)

          // Fetch profile in parallel
          const profile = await fetchUserProfile(currentSession.user.id)
          if (mounted) {
            setUserProfile(profile)
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        if (mounted) {
          setIsLoading(false)
          setAuthInitialized(true)
        }
      }
    }

    initAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return

      if (currentSession?.user) {
        setSession(currentSession)
        setUser(currentSession.user)

        // Only fetch profile if needed
        if (!userProfile || userProfile.user_id !== currentSession.user.id) {
          const profile = await fetchUserProfile(currentSession.user.id)
          if (mounted) {
            setUserProfile(profile)
          }
        }
      } else {
        setSession(null)
        setUser(null)
        setUserProfile(null)
      }

      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [authInitialized, fetchUserProfile, userProfile])

  // Sign out function
  const signOut = useCallback(async () => {
    setIsLoading(true)
    try {
      await supabaseBrowser.auth.signOut()
      setSession(null)
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error("Exception signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userProfile,
        isLoading,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
