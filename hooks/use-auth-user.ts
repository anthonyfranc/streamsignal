"use client"

import { useState, useEffect, useRef } from "react"
import { reviewsService } from "@/services/reviews-service"

/**
 * Custom hook to manage the current authenticated user and profile
 */
export function useAuthUser() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isFetchingUserProfile = useRef(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true)
        const user = await reviewsService.getCurrentUser()
        setCurrentUser(user)

        if (user && !isFetchingUserProfile.current) {
          isFetchingUserProfile.current = true

          try {
            // Fetch user profile
            const { data: profile } = await reviewsService.getUserProfile(user.id)
            setUserProfile(profile || null)
          } catch (error) {
            console.error("Error fetching user profile:", error)
            setUserProfile(null)
          } finally {
            isFetchingUserProfile.current = false
          }
        }
      } catch (error) {
        console.error("Error checking user:", error)
        setCurrentUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [])

  return {
    currentUser,
    userProfile,
    isLoading,
  }
}
