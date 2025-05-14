"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
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

  // Function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabaseBrowser.from("user_profiles").select("*").eq("user_id", userId).single()

      if (error) {
        console.error("Error fetching user profile:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Exception fetching user profile:", error)
      return null
    }
  }

  // Function to refresh the session and user data
  const refreshSession = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (error) {
        console.error("Error refreshing session:", error)
        setSession(null)
        setUser(null)
        setUserProfile(null)
        return
      }

      const currentSession = data.session
      setSession(currentSession)

      if (currentSession?.user) {
        setUser(currentSession.user)
        const profile = await fetchUserProfile(currentSession.user.id)
        setUserProfile(profile)
      } else {
        setUser(null)
        setUserProfile(null)
      }
    } catch (error) {
      console.error("Exception refreshing session:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Check for existing session in localStorage first for immediate UI update
    const checkLocalStorage = () => {
      try {
        const storedSession = localStorage.getItem("streamsignal_auth_token")
        if (storedSession) {
          // We have a session in localStorage, set loading to false to show logged-in UI immediately
          // The actual session will be validated by refreshSession
          setIsLoading(false)
        }
      } catch (error) {
        // localStorage might not be available in some contexts
        console.error("Error checking localStorage:", error)
      }
    }

    // Try to check localStorage first
    checkLocalStorage()

    // Then refresh the session properly
    refreshSession()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event)
      setSession(currentSession)

      if (currentSession?.user) {
        setUser(currentSession.user)
        const profile = await fetchUserProfile(currentSession.user.id)
        setUserProfile(profile)
      } else {
        setUser(null)
        setUserProfile(null)
      }

      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Sign out function
  const signOut = async () => {
    try {
      await supabaseBrowser.auth.signOut()
      setSession(null)
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

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
