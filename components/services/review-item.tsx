"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Star, ThumbsUp, ThumbsDown, MessageSquare, X, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { submitVote } from "@/app/actions/vote-actions"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { cn } from "@/lib/utils"
import type { Review, Reply } from "@/types/reviews"
import { formatDistanceToNow } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { getAuthToken } from "@/utils/auth-utils"

// Add isVisible prop to the ReviewItem component
interface ReviewItemProps {
  review: Review
  serviceId: number
  replies: Reply[]
  isVisible?: boolean
}

// Simple throttle function
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let lastFunc: ReturnType<typeof setTimeout>
  let lastRan = 0

  return function (...args: Parameters<T>) {
    const now = Date.now()

    if (now - lastRan >= limit) {
      func.apply(this, args)
      lastRan = now
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args)
            lastRan = Date.now()
          }
        },
        limit - (now - lastRan),
      )
    }
  }
}

// Add this helper function to handle Supabase API errors
const handleSupabaseError = (error: any, fallbackMessage: string): string => {
  // Check for rate limiting errors
  if (error.message && error.message.includes("Too Many")) {
    return "Rate limited by the server. Please try again in a moment."
  }

  // Return the error message or a fallback
  return error.message || fallbackMessage
}

// Helper function to update an optimistic nested reply
const updateOptimisticNestedReply = (replies: Reply[], replyId: number, updateFn: (reply: Reply) => Reply): Reply[] => {
  return replies.map((reply) => {
    if (reply.id === replyId) {
      return updateFn(reply)
    }
    if (reply.replies && reply.replies.length > 0) {
      return {
        ...reply,
        replies: updateOptimisticNestedReply(reply.replies, replyId, updateFn),
      }
    }
    return reply
  })
}

export function ReviewItem({ review, serviceId, replies: initialReplies, isVisible = true }: ReviewItemProps) {
  const { user, session, refreshSession } = useAuth()
  const [replyingTo, setReplyingTo] = useState<{ id: number | null; name: string } | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [localReplies, setLocalReplies] = useState<Reply[]>(initialReplies)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)
  const newReplyRef = useRef<HTMLDivElement>(null)
  const [newReplyId, setNewReplyId] = useState<number | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pendingReplyIds, setPendingReplyIds] = useState<Set<number>>(new Set())
  const [optimisticReplyMap, setOptimisticReplyMap] = useState<Map<number, number>>(new Map())
  const [isVoting, setIsVoting] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Track when the component is actually visible in the viewport
  const reviewItemRef = useRef<HTMLDivElement>(null)
  const [isInViewport, setIsInViewport] = useState(false)

  // Set up intersection observer to detect when the component is visible
  useEffect(() => {
    if (!reviewItemRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setIsInViewport(entry.isIntersecting)
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1, // Consider visible when 10% is in viewport
      },
    )

    observer.observe(reviewItemRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  // Track processed reply IDs to prevent duplicates
  const processedReplyIdsRef = useRef<Set<number>>(new Set())

  // Get auth token on component mount
  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      const token = getAuthToken()
      setAuthToken(token)
    }
  }, [])

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const isAuth = !!data.session || !!authToken
        setIsAuthenticated(isAuth)
        console.log("Authentication check:", isAuth ? "Authenticated" : "Not authenticated")
      } catch (error) {
        console.error("Error checking authentication:", error)
      }
    }

    checkAuth()
  }, [user, session, authToken])

  // Initialize with the provided replies and track their IDs
  useEffect(() => {
    // Reset the processed IDs when initialReplies changes
    processedReplyIdsRef.current = new Set()

    // Add all initial reply IDs to the processed set
    const addReplyIdsToProcessed = (replies: Reply[]) => {
      replies.forEach((reply) => {
        processedReplyIdsRef.current.add(reply.id)
        if (reply.replies && reply.replies.length > 0) {
          addReplyIdsToProcessed(reply.replies)
        }
      })
    }

    addReplyIdsToProcessed(initialReplies)
    setLocalReplies(initialReplies)
  }, [initialReplies])

  // Clear success message after a delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Fetch the latest vote counts for this review
  const fetchReviewVoteCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("service_reviews")
        .select("likes, dislikes")
        .eq("id", review.id)
        .single()

      if (data && !error) {
        // Update the review's vote counts
        review.likes = data.likes
        review.dislikes = data.dislikes
      }
    } catch (error) {
      console.error("Error fetching review vote counts:", error)
    }
  }

  // Helper function to add a nested reply
  const addNestedReply = (replies: Reply[], parentId: number, newReply: Reply): Reply[] => {
    return replies.map((reply) => {
      if (reply.id === parentId) {
        return {
          ...reply,
          replies: [...(reply.replies || []), newReply],
        }
      } else if (reply.replies && reply.replies.length > 0) {
        return {
          ...reply,
          replies: addNestedReply(reply.replies, parentId, newReply),
        }
      }
      return reply
    })
  }

  // Helper function to update a reply in the thread
  const updateReplyInThread = (replies: Reply[], replyId: number, updatedReply: Reply): Reply[] => {
    return replies.map((reply) => {
      if (reply.id === replyId) {
        return { ...reply, ...updatedReply, replies: reply.replies }
      } else if (reply.replies && reply.replies.length > 0) {
        return {
          ...reply,
          replies: updateReplyInThread(reply.replies, replyId, updatedReply),
        }
      }
      return reply
    })
  }

  // Helper function to remove a reply from the thread
  const removeReplyFromThread = (replies: Reply[], replyId: number): Reply[] => {
    return replies.filter((reply) => {
      if (reply.id === replyId) {
        return false
      }
      if (reply.replies && reply.replies.length > 0) {
        reply.replies = removeReplyFromThread(reply.replies, replyId)
      }
      return true
    })
  }

  // Helper function to find a temporary ID for a real ID
  const findTempIdForRealId = (realId: number): number | null => {
    for (const [tempId, mappedRealId] of optimisticReplyMap.entries()) {
      if (mappedRealId === realId) {
        return tempId
      }
    }
    return null
  }

  const handleReplySubmit = async (event: React.FormEvent, parentId: number | null = null) => {
    event.preventDefault()

    if (!user && !authToken) {
      setAuthModalOpen(true)
      return
    }

    if (!replyContent.trim()) {
      setErrorMessage("Please enter a reply")
      return
    }

    setIsPending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Ensure we have a fresh session
      if (user) {
        await refreshSession()
      }

      // Force a new auth token to be used
      const { data: authData } = await supabase.auth.getSession()
      if (!authData.session && !authToken) {
        setErrorMessage("Your session has expired. Please sign in again.")
        setAuthModalOpen(true)
        return
      }

      console.log("Submitting reply with auth:", !!authData.session || !!authToken)

      // Generate a temporary negative ID for the optimistic reply
      const tempId = -Math.floor(Math.random() * 1000000)

      // Use the provided parentId or the one from replyingTo state
      const actualParentId = parentId !== null ? parentId : replyingTo?.id || null

      // Add optimistic reply to UI immediately
      const optimisticReply: Reply = {
        id: tempId, // Temporary negative ID
        review_id: review.id,
        parent_id: actualParentId,
        user_id: user?.id || "anonymous",
        author_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
        content: replyContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        status: "approved",
        user_profile: {
          avatar_url: user?.user_metadata?.avatar_url || null,
        },
        replies: [],
      }

      // Add to local state
      if (optimisticReply.parent_id === null) {
        setLocalReplies((prev) => [...prev, optimisticReply])
      } else {
        setLocalReplies((prev) => addNestedReply(prev, optimisticReply.parent_id!, optimisticReply))
      }

      // Set as new reply for animation
      setNewReplyId(optimisticReply.id)

      // Use try-catch to handle potential rate limiting
      try {
        // Submit directly to Supabase instead of using the server action
        const { data: insertedReply, error } = await supabase
          .from("review_replies")
          .insert({
            review_id: review.id,
            parent_id: actualParentId,
            user_id: user?.id || "anonymous",
            author_name:
              user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User",
            content: replyContent,
            likes: 0,
            dislikes: 0,
            status: "approved", // Set to approved for immediate display
          })
          .select()
          .single()

        if (error) {
          // Handle the error, possibly due to rate limiting
          throw error
        }

        // Add the real reply ID to the processed set to prevent duplicates
        processedReplyIdsRef.current.add(insertedReply.id)

        // Clear the form after successful submission
        setReplyContent("")
        setReplyingTo(null)
        // No success message, just reset the form

        // Add the real ID to the pending set so we ignore the realtime update
        setPendingReplyIds((prev) => {
          const newSet = new Set(prev)
          newSet.add(insertedReply.id)
          return newSet
        })

        // Map the temporary ID to the real ID
        setOptimisticReplyMap((prev) => {
          const newMap = new Map(prev)
          newMap.set(tempId, insertedReply.id)
          return newMap
        })

        // Replace the optimistic reply with the real one
        if (optimisticReply.parent_id === null) {
          setLocalReplies((prev) =>
            prev.map((reply) =>
              reply.id === tempId
                ? { ...insertedReply, user_profile: optimisticReply.user_profile, replies: [] }
                : reply,
            ),
          )
        } else {
          setLocalReplies((prev) =>
            replaceOptimisticNestedReply(prev, tempId, {
              ...insertedReply,
              user_profile: optimisticReply.user_profile,
              replies: [],
            }),
          )
        }
      } catch (error: any) {
        console.error("Error submitting reply:", error)

        // Display appropriate error message based on error type
        setErrorMessage(handleSupabaseError(error, "Failed to save reply. Please try again."))

        // Even if we fail to save to the server, let's keep the optimistic reply in the UI
        // but mark it as failed by adding a warning or styling
        if (optimisticReply.parent_id === null) {
          setLocalReplies((prev) =>
            prev.map((reply) =>
              reply.id === tempId
                ? { ...reply, content: reply.content + " (sending failed - try again)", status: "error" as any }
                : reply,
            ),
          )
        } else {
          setLocalReplies((prev) =>
            updateOptimisticNestedReply(prev, tempId, (reply) => ({
              ...reply,
              content: reply.content + " (sending failed - try again)",
              status: "error" as any,
            })),
          )
        }
      }

      // Clear the new reply ID after animation
      setTimeout(() => {
        setNewReplyId(null)
      }, 3000)
    } catch (error: any) {
      console.error("Error in reply submission process:", error)
      setErrorMessage("An unexpected error occurred. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  // Helper function to remove an optimistic nested reply
  const removeOptimisticNestedReply = (replies: Reply[], replyId: number): Reply[] => {
    return replies.map((reply) => {
      if (reply.replies && reply.replies.length > 0) {
        const filteredReplies = reply.replies.filter((r) => r.id !== replyId)
        if (filteredReplies.length !== reply.replies.length) {
          // Found and removed the reply
          return { ...reply, replies: filteredReplies }
        }
        // Check deeper in the tree
        return { ...reply, replies: removeOptimisticNestedReply(reply.replies, replyId) }
      }
      return reply
    })
  }

  // Helper function to replace an optimistic nested reply with the real one
  const replaceOptimisticNestedReply = (replies: Reply[], tempId: number, realReply: Reply): Reply[] => {
    return replies.map((reply) => {
      if (reply.replies && reply.replies.length > 0) {
        const updatedReplies = reply.replies.map((r) => (r.id === tempId ? realReply : r))
        if (updatedReplies.some((r) => r.id === realReply.id)) {
          // Found and replaced the reply
          return { ...reply, replies: updatedReplies }
        }
        // Check deeper in the tree
        return { ...reply, replies: replaceOptimisticNestedReply(reply.replies, tempId, realReply) }
      }
      return reply
    })
  }

  // Update the handleVote function to use throttling instead of debouncing
  const handleVote = useCallback(
    throttle((voteType: "like" | "dislike") => {
      if ((!user && !authToken) || isVoting) {
        if (!user && !authToken) setAuthModalOpen(true)
        return
      }

      setIsVoting(true)

      // Optimistically update UI
      if (voteType === "like") {
        review.likes = (review.likes || 0) + 1
      } else {
        review.dislikes = (review.dislikes || 0) + 1
      }

      // Force a re-render
      setLocalReplies([...localReplies])

      // Submit to server with a slight delay to prevent rate limiting
      setTimeout(async () => {
        try {
          const formData = new FormData()
          formData.append("reviewId", review.id.toString())
          formData.append("voteType", voteType)
          formData.append("serviceId", serviceId.toString())

          // Add auth token to the form data if available
          if (authToken) {
            formData.append("authToken", authToken)
          }

          const result = await submitVote(formData)

          // If authentication is required, show the auth modal
          if (!result.success && result.requireAuth) {
            setAuthModalOpen(true)

            // Revert optimistic update
            if (voteType === "like") {
              review.likes = Math.max(0, (review.likes || 0) - 1)
            } else {
              review.dislikes = Math.max(0, (review.dislikes || 0) - 1)
            }
            // Force a re-render
            setLocalReplies([...localReplies])
          }
        } catch (error) {
          console.error("Error submitting vote:", error)
          // Revert optimistic update on error
          if (voteType === "like") {
            review.likes = Math.max(0, (review.likes || 0) - 1)
          } else {
            review.dislikes = Math.max(0, (review.dislikes || 0) - 1)
          }
          // Force a re-render
          setLocalReplies([...localReplies])
        } finally {
          setIsVoting(false)
        }
      }, 300)
    }, 1000), // Throttle to one vote per second
    [review.id, serviceId, isVoting, user, localReplies, authToken],
  )

  // Similarly update the handleReplyVote function to use throttling
  const handleReplyVote = useCallback(
    throttle((replyId: number, voteType: "like" | "dislike") => {
      if ((!user && !authToken) || isVoting) {
        if (!user && !authToken) setAuthModalOpen(true)
        return
      }

      setIsVoting(true)

      // Find the reply and optimistically update it
      setLocalReplies((prev) => {
        const updateReplyVote = (replies: Reply[]): Reply[] => {
          return replies.map((reply) => {
            if (reply.id === replyId) {
              return {
                ...reply,
                likes: voteType === "like" ? (reply.likes || 0) + 1 : reply.likes,
                dislikes: voteType === "dislike" ? (reply.dislikes || 0) + 1 : reply.dislikes,
              }
            }
            if (reply.replies && reply.replies.length > 0) {
              return {
                ...reply,
                replies: updateReplyVote(reply.replies),
              }
            }
            return reply
          })
        }
        return updateReplyVote(prev)
      })

      // Submit to server with a slight delay to prevent rate limiting
      setTimeout(async () => {
        try {
          const formData = new FormData()
          formData.append("replyId", replyId.toString())
          formData.append("voteType", voteType)
          formData.append("serviceId", serviceId.toString())

          // Add auth token to the form data if available
          if (authToken) {
            formData.append("authToken", authToken)
          }

          const result = await submitVote(formData)

          // If authentication is required, show the auth modal
          if (!result.success && result.requireAuth) {
            setAuthModalOpen(true)

            // Revert optimistic update
            setLocalReplies((prev) => {
              const revertReplyVote = (replies: Reply[]): Reply[] => {
                return replies.map((reply) => {
                  if (reply.id === replyId) {
                    return {
                      ...reply,
                      likes: voteType === "like" ? Math.max(0, (reply.likes || 0) - 1) : reply.likes,
                      dislikes: voteType === "dislike" ? Math.max(0, (reply.dislikes || 0) - 1) : reply.dislikes,
                    }
                  }
                  if (reply.replies && reply.replies.length > 0) {
                    return {
                      ...reply,
                      replies: revertReplyVote(reply.replies),
                    }
                  }
                  return reply
                })
              }
              return revertReplyVote(prev)
            })
          }
        } catch (error) {
          console.error("Error submitting reply vote:", error)
          // Revert optimistic update on error
          setLocalReplies((prev) => {
            const revertReplyVote = (replies: Reply[]): Reply[] => {
              return replies.map((reply) => {
                if (reply.id === replyId) {
                  return {
                    ...reply,
                    likes: voteType === "like" ? Math.max(0, (reply.likes || 0) - 1) : reply.likes,
                    dislikes: voteType === "dislike" ? Math.max(0, (reply.dislikes || 0) - 1) : reply.dislikes,
                  }
                }
                if (reply.replies && reply.replies.length > 0) {
                  return {
                    ...reply,
                    replies: revertReplyVote(reply.replies),
                  }
                }
                return reply
              })
            }
            return revertReplyVote(prev)
          })
        } finally {
          setIsVoting(false)
        }
      }, 300)
    }, 1000), // Throttle to one vote per second
    [serviceId, isVoting, user, authToken],
  )

  const handleAuthSuccess = async () => {
    setAuthModalOpen(false)
    setShowReplies(true) // Show replies section after login

    // Refresh the session after successful login
    await refreshSession()

    // Update authentication status
    const { data } = await supabase.auth.getSession()
    setIsAuthenticated(!!data.session)

    // Get the auth token
    const token = getAuthToken()
    setAuthToken(token)

    // Focus the reply input after a short delay
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus()
      }
    }, 100)
  }

  const toggleReplies = () => {
    if (!showReplies) {
      setShowReplies(true)
    } else if (!replyingTo) {
      // Only hide replies if not actively replying to someone
      setShowReplies(false)
    }
  }

  const initiateReply = (parentId: number | null = null, parentName = "") => {
    if (!user && !authToken) {
      setAuthModalOpen(true)
      return
    }

    if (parentId !== null) {
      setReplyingTo({ id: parentId, name: parentName })
    } else {
      setReplyingTo(null)
    }

    setShowReplies(true) // Always show replies when replying

    // Focus the reply input after a short delay
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus()
      }
    }, 100)
  }

  // Format date to relative time (e.g., "2 days ago")
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (e) {
      return new Date(dateString).toLocaleDateString()
    }
  }

  // Inline reply form component
  const InlineReplyForm = ({ parentId, parentName }: { parentId: number; parentName: string }) => {
    const [inlineReplyContent, setInlineReplyContent] = useState("")
    const [isInlinePending, setIsInlinePending] = useState(false)
    const inlineInputRef = useRef<HTMLTextAreaElement>(null)

    // Focus the input when the form is mounted
    useEffect(() => {
      if (inlineInputRef.current) {
        inlineInputRef.current.focus()
      }
    }, [])

    const handleInlineSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      if (!inlineReplyContent.trim()) return

      setIsInlinePending(true)

      try {
        // Ensure we have a fresh session
        if (user) {
          await refreshSession()
        }

        // Force a new auth token to be used
        const { data: authData } = await supabase.auth.getSession()
        if (!authData.session && !authToken) {
          setErrorMessage("Your session has expired. Please sign in again.")
          setAuthModalOpen(true)
          setIsInlinePending(false)
          return
        }

        // Generate a temporary negative ID for the optimistic reply
        const tempId = -Math.floor(Math.random() * 1000000)

        // Add optimistic reply to UI immediately
        const optimisticReply: Reply = {
          id: tempId, // Temporary negative ID
          review_id: review.id,
          parent_id: parentId,
          user_id: user?.id || "anonymous",
          author_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
          content: inlineReplyContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          status: "approved",
          user_profile: {
            avatar_url: user?.user_metadata?.avatar_url || null,
          },
          replies: [],
        }

        // Add to local state
        setLocalReplies((prev) => addNestedReply(prev, parentId, optimisticReply))

        // Set as new reply for animation
        setNewReplyId(optimisticReply.id)

        // Submit directly to Supabase
        const { data: insertedReply, error } = await supabase
          .from("review_replies")
          .insert({
            review_id: review.id,
            parent_id: parentId,
            user_id: user?.id || "anonymous",
            author_name:
              user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User",
            content: inlineReplyContent,
            likes: 0,
            dislikes: 0,
            status: "approved", // Set to approved for immediate display
          })
          .select()
          .single()

        if (error) {
          console.error("Error submitting inline reply:", error)
          setErrorMessage(`Failed to save reply: ${error.message}`)

          // Remove the optimistic reply
          setLocalReplies((prev) => removeOptimisticNestedReply(prev, optimisticReply.id))
        } else {
          // Add the real reply ID to the processed set to prevent duplicates
          processedReplyIdsRef.current.add(insertedReply.id)

          // Add the real ID to the pending set so we ignore the realtime update
          setPendingReplyIds((prev) => {
            const newSet = new Set(prev)
            newSet.add(insertedReply.id)
            return newSet
          })

          // Map the temporary ID to the real ID
          setOptimisticReplyMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(tempId, insertedReply.id)
            return newMap
          })

          // Replace the optimistic reply with the real one
          setLocalReplies((prev) =>
            replaceOptimisticNestedReply(prev, tempId, {
              ...insertedReply,
              user_profile: optimisticReply.user_profile,
              replies: [],
            }),
          )

          // No success message, just visual feedback through animation
        }

        // Clear the form and reset the replying state
        setInlineReplyContent("")
        setReplyingTo(null)

        // Clear the new reply ID after animation
        setTimeout(() => {
          setNewReplyId(null)
        }, 3000)
      } catch (error) {
        console.error("Error submitting inline reply:", error)
        setErrorMessage("Failed to submit reply. Please try again.")
      } finally {
        setIsInlinePending(false)
      }
    }

    return (
      <div className="mt-4 ml-6 mb-5">
        <form onSubmit={handleInlineSubmit} className="flex items-start gap-3" action="javascript:void(0);">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={user?.user_metadata?.avatar_url || "/placeholder.svg?height=32&width=32&query=avatar"}
              alt={user?.user_metadata?.full_name || "User"}
            />
            <AvatarFallback>
              {(user?.user_metadata?.full_name || user?.email || "U").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex flex-col items-start gap-0">
            <div className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-t-md mb-0 self-start">
              <span>Replying to {parentName}</span>
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full"
                onClick={() => setReplyingTo(null)}
                aria-label="Cancel reply"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-end gap-2 w-full">
              <div className="flex-1">
                <Textarea
                  ref={inlineInputRef}
                  placeholder={`Write a reply to ${parentName}...`}
                  className="min-h-[60px] py-2 px-3 resize-none border-gray-200 focus:border-gray-300 focus:ring-gray-200 rounded-md rounded-tl-none border-t-0"
                  value={inlineReplyContent}
                  onChange={(e) => setInlineReplyContent(e.target.value)}
                />
              </div>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full transition-all duration-200"
                  disabled={isInlinePending || !inlineReplyContent.trim()}
                >
                  {isInlinePending ? <span className="animate-spin">⏳</span> : <Send className="h-4 w-4" />}
                </Button>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // Recursive component for rendering replies
  const ReplyThread = ({ reply, depth = 0 }: { reply: Reply; depth?: number }) => {
    const maxDepth = 3 // Maximum nesting level
    const isNew = reply.id === newReplyId
    const replyRef = isNew ? newReplyRef : null
    const isReplying = replyingTo?.id === reply.id

    return (
      <motion.div
        ref={replyRef}
        initial={isNew ? { opacity: 0, y: -10, scale: 0.95 } : false}
        animate={isNew ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn("flex flex-col", depth > 0 && "ml-6 mt-4")}
        whileHover={{ x: 2 }}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={reply.user_profile?.avatar_url || "/placeholder.svg?height=32&width=32&query=avatar"}
              alt={reply.author_name}
            />
            <AvatarFallback>{reply.author_name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <motion.div
              className={cn("bg-gray-50 rounded-lg p-3 relative", isNew && "bg-blue-50")}
              animate={
                isNew
                  ? {
                      boxShadow: [
                        "0 0 0 rgba(59, 130, 246, 0)",
                        "0 0 8px rgba(59, 130, 246, 0.5)",
                        "0 0 0 rgba(59, 130, 246, 0)",
                      ],
                    }
                  : {}
              }
              transition={
                isNew
                  ? {
                      repeat: 2,
                      duration: 1.5,
                    }
                  : {}
              }
            >
              {depth > 0 && <div className="absolute -left-4 top-4 w-3 h-0.5 bg-gray-200"></div>}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{reply.author_name}</span>
                <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
              </div>
              <p className="text-sm mt-1 break-words">{reply.content}</p>
            </motion.div>
            <div className="flex items-center gap-4 mt-2 ml-1">
              <button
                className={cn(
                  "flex items-center gap-1 text-xs hover:text-gray-900 transition-colors",
                  reply.likes > 0 ? "text-gray-900" : "text-gray-500",
                )}
                onClick={() => handleReplyVote(reply.id, "like")}
                disabled={isVoting}
              >
                <ThumbsUp className="h-3 w-3" />
                <span>{reply.likes > 0 ? reply.likes : "Like"}</span>
              </button>
              <button
                className={cn(
                  "flex items-center gap-1 text-xs hover:text-gray-900 transition-colors",
                  reply.dislikes > 0 ? "text-gray-900" : "text-gray-500",
                )}
                onClick={() => handleReplyVote(reply.id, "dislike")}
                disabled={isVoting}
              >
                <ThumbsDown className="h-3 w-3" />
                <span>{reply.dislikes > 0 ? reply.dislikes : "Dislike"}</span>
              </button>
              {depth < maxDepth && (
                <button
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                  onClick={() => initiateReply(reply.id, reply.author_name)}
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline reply form when replying to this specific comment */}
        {isReplying && (user || authToken) && <InlineReplyForm parentId={reply.id} parentName={reply.author_name} />}

        {/* Nested replies */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="pl-4 border-l-2 border-gray-100 ml-4 mt-3">
            {reply.replies.map((childReply) => (
              <ReplyThread key={`${childReply.id}-${childReply.created_at}`} reply={childReply} depth={depth + 1} />
            ))}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <Card
      key={review.id}
      className="overflow-hidden mb-4 transition-all duration-300 hover:shadow-md"
      ref={reviewItemRef}
    >
      <CardContent className="p-0">
        <div className="flex items-start p-4 gap-4">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage
              src={review.user_profile?.avatar_url || "/placeholder.svg?height=40&width=40&query=avatar"}
              alt={review.author_name}
            />
            <AvatarFallback>{review.author_name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-semibold">{review.author_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= review.rating ? "text-black fill-black" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                </div>
              </div>
            </div>
            <h5 className="font-medium mt-3">{review.title}</h5>
            <p className="text-sm mt-2 text-gray-700 break-words">{review.content}</p>
            <div className="flex items-center gap-4 mt-4">
              <button
                className={cn(
                  "flex items-center gap-1 text-xs transition-all duration-200 hover:text-gray-900 hover:scale-110",
                  review.likes > 0 ? "text-gray-900" : "text-gray-500",
                )}
                onClick={() => handleVote("like")}
                disabled={isVoting}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{review.likes > 0 ? review.likes : "Like"}</span>
              </button>
              <button
                className={cn(
                  "flex items-center gap-1 text-xs transition-all duration-200 hover:text-gray-900 hover:scale-110",
                  review.dislikes > 0 ? "text-gray-900" : "text-gray-500",
                )}
                onClick={() => handleVote("dislike")}
                disabled={isVoting}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>{review.dislikes > 0 ? review.dislikes : "Dislike"}</span>
              </button>
              <button
                className="flex items-center gap-1 text-xs text-gray-500 transition-all duration-200 hover:text-gray-900 hover:scale-110"
                onClick={toggleReplies}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>
                  {localReplies.length > 0
                    ? `${localReplies.length} ${localReplies.length === 1 ? "reply" : "replies"}`
                    : "Reply"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Threaded Replies */}
        {showReplies && (
          <div className="px-4 pb-5 pt-2 border-t">
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {localReplies.length > 0 && (
              <div className="space-y-5 mb-5">
                {localReplies.map((reply) => (
                  <ReplyThread key={`${reply.id}-${reply.created_at}`} reply={reply} />
                ))}
              </div>
            )}

            {/* Main reply form - only show if not replying to a specific comment */}
            {(user || authToken) && !replyingTo && (
              <form
                onSubmit={(e) => handleReplySubmit(e)}
                className="flex items-start gap-3 mt-4"
                action="javascript:void(0);"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url || "/placeholder.svg?height=32&width=32&query=avatar"}
                    alt={user?.user_metadata?.full_name || "User"}
                  />
                  <AvatarFallback>
                    {(user?.user_metadata?.full_name || user?.email || "U").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      ref={replyInputRef}
                      placeholder={`Write a comment, ${user?.user_metadata?.full_name?.split(" ")[0] || "there"}...`}
                      className="min-h-[60px] py-2 px-3 resize-none border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full transition-all hover:scale-105 active:scale-95"
                    disabled={isPending || !replyContent.trim()}
                  >
                    {isPending ? <span className="animate-spin">⏳</span> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            )}

            {/* Sign in prompt if not logged in */}
            {!user && !authToken && (
              <div
                className="flex items-center justify-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mt-4"
                onClick={() => setAuthModalOpen(true)}
              >
                <span className="text-sm text-gray-500">Sign in to leave a comment</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        defaultTab="login"
        title="Sign in to interact"
        description="Join our community to share your thoughts and interact with reviews."
      />
    </Card>
  )
}
