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
      // First try with user_id field
      let { data, error } = await supabaseBrowser.from("user_profiles").select("*").eq("user_id", userId).single()

      // If that fails, try with id field
      if (error) {
        console.log("Trying to fetch profile with id field instead of user_id")
        const result = await supabaseBrowser.from("user_profiles").select("*").eq("id", userId).single()

        data = result.data
        error = result.error
      }

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
      console.log("Refreshing session...")
      const { data, error } = await supabaseBrowser.auth.getSession()

      if (error) {
        console.error("Error refreshing session:", error)
        setSession(null)
        setUser(null)
        setUserProfile(null)
        setIsLoading(false)
        return
      }

      const currentSession = data.session
      console.log("Session refreshed:", currentSession ? "Session found" : "No session")

      setSession(currentSession)

      if (currentSession?.user) {
        console.log("User found in session:", currentSession.user.id)
        setUser(currentSession.user)

        const profile = await fetchUserProfile(currentSession.user.id)
        console.log("User profile:", profile ? "Profile found" : "No profile found")
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
    console.log("AuthProvider: Initializing auth state")

    // Immediately refresh the session
    refreshSession()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event)

      setSession(currentSession)

      if (currentSession?.user) {
        console.log("User found in auth change:", currentSession.user.id)
        setUser(currentSession.user)

        const profile = await fetchUserProfile(currentSession.user.id)
        console.log("User profile from auth change:", profile ? "Profile found" : "No profile found")
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
    setIsLoading(true)
    try {
      // Clear any custom tokens we might have set
      try {
        localStorage.removeItem("streamsignal_auth_token")
        localStorage.removeItem("supabase.auth.token")
      } catch (e) {
        console.error("Error clearing local storage:", e)
      }

      const { error } = await supabaseBrowser.auth.signOut()
      if (error) {
        console.error("Error signing out:", error)
      }

      setSession(null)
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error("Exception signing out:", error)
    } finally {
      setIsLoading(false)
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
