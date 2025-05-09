"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
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

interface ReviewItemProps {
  review: Review
  serviceId: number
  replies: Reply[]
}

export function ReviewItem({ review, serviceId, replies: initialReplies }: ReviewItemProps) {
  const { user, session, refreshSession } = useAuth()
  const [replyingTo, setReplyingTo] = useState<{ id: number | null; name: string } | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [localReplies, setLocalReplies] = useState<Reply[]>(initialReplies)
  const formRef = useRef<HTMLFormElement>(null)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)
  const newReplyRef = useRef<HTMLDivElement>(null)
  const [newReplyId, setNewReplyId] = useState<number | null>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pendingReplyIds, setPendingReplyIds] = useState<Set<number>>(new Set())
  const [optimisticReplyMap, setOptimisticReplyMap] = useState<Map<number, number>>(new Map())

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      setIsAuthenticated(!!data.session)
      console.log("Authentication check:", !!data.session ? "Authenticated" : "Not authenticated")
    }

    checkAuth()
  }, [user, session])

  // Set up real-time subscriptions
  useEffect(() => {
    // Clean up any existing channels
    channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })

    const newChannels = []

    // Set up real-time subscription for replies to this review
    const replyChannel = supabase
      .channel(`review_replies_${review.id}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_replies",
          filter: `review_id=eq.${review.id}`,
        },
        async (payload) => {
          if (payload.new && (payload.new as any).status === "approved") {
            // For new replies, fetch the user profile
            if (payload.eventType === "INSERT") {
              const reply = payload.new as Reply

              // Check if this is a reply we've already handled optimistically
              if (pendingReplyIds.has(reply.id)) {
                console.log("Ignoring realtime update for optimistically handled reply:", reply.id)

                // Remove from pending set since we've now received the real-time confirmation
                setPendingReplyIds((prev) => {
                  const newSet = new Set(prev)
                  newSet.delete(reply.id)
                  return newSet
                })

                return
              }

              // Check if this is a reply that replaces an optimistic one
              const tempId = findTempIdForRealId(reply.id)
              if (tempId) {
                console.log("Replacing optimistic reply:", tempId, "with real reply:", reply.id)

                // Replace the optimistic reply with the real one
                setLocalReplies((prev) =>
                  prev.map((r) => {
                    if (r.id === tempId) {
                      return {
                        ...reply,
                        user_profile: r.user_profile, // Keep the user profile from the optimistic reply
                        replies: r.replies || [], // Keep any nested replies
                      }
                    }
                    return r
                  }),
                )

                // Remove the mapping
                setOptimisticReplyMap((prev) => {
                  const newMap = new Map(prev)
                  newMap.delete(tempId)
                  return newMap
                })

                return
              }

              // This is a genuinely new reply from someone else
              const replyWithProfile = { ...reply, user_profile: { avatar_url: null }, replies: [] }

              if (reply.user_id) {
                const { data: profileData } = await supabase
                  .from("user_profiles")
                  .select("avatar_url")
                  .eq("id", reply.user_id)
                  .single()

                if (profileData) {
                  replyWithProfile.user_profile = profileData
                }
              }

              // Mark this as the newest reply for animation
              setNewReplyId(reply.id)

              // Update the local replies state based on parent_id
              if (reply.parent_id === null) {
                // Top-level reply
                setLocalReplies((prev) => [...prev, replyWithProfile])
              } else {
                // Nested reply - update the thread structure
                setLocalReplies((prev) => addNestedReply(prev, reply.parent_id!, replyWithProfile))
              }

              // Clear the new reply ID after animation
              setTimeout(() => {
                setNewReplyId(null)
              }, 3000)
            }
            // For updated replies, update the local state
            else if (payload.eventType === "UPDATE") {
              setLocalReplies((prev) => updateReplyInThread(prev, (payload.new as Reply).id, payload.new as Reply))
            }
            // For deleted replies, remove from local state
            else if (payload.eventType === "DELETE" && payload.old) {
              setLocalReplies((prev) => removeReplyFromThread(prev, (payload.old as Reply).id))
            }
          }
        },
      )
      .subscribe((status) => {
        console.log(`Realtime subscription to review_replies status: ${status}`)
        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed to review_replies changes`)
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          // Try to reconnect after a delay
          setTimeout(() => {
            console.log("Attempting to reconnect to review_replies...")
            replyChannel.subscribe()
          }, 2000)
        }
      })

    newChannels.push(replyChannel)

    // Set up real-time subscription for votes on this review
    const voteChannel = supabase
      .channel(`review_votes_${review.id}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "review_votes",
          filter: `review_id=eq.${review.id}`,
        },
        (payload) => {
          // We'll handle vote updates by fetching the latest counts
          if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
            fetchReviewVoteCounts()
          }
        },
      )
      .subscribe((status) => {
        console.log(`Realtime subscription to review_votes status: ${status}`)
        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed to review_votes changes`)
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          // Try to reconnect after a delay
          setTimeout(() => {
            console.log("Attempting to reconnect to review_votes...")
            voteChannel.subscribe()
          }, 2000)
        }
      })

    newChannels.push(voteChannel)

    setChannels(newChannels)

    return () => {
      newChannels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [review.id, pendingReplyIds])

  // Helper function to find a temporary ID for a real ID
  const findTempIdForRealId = (realId: number): number | null => {
    for (const [tempId, mappedRealId] of optimisticReplyMap.entries()) {
      if (mappedRealId === realId) {
        return tempId
      }
    }
    return null
  }

  // Initialize with the provided replies
  useEffect(() => {
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

  const handleReplySubmit = async (event: React.FormEvent, parentId: number | null = null) => {
    event.preventDefault()

    if (!user || !session) {
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
      await refreshSession()

      // Force a new auth token to be used
      const { data: authData } = await supabase.auth.getSession()
      if (!authData.session) {
        setErrorMessage("Your session has expired. Please sign in again.")
        setAuthModalOpen(true)
        return
      }

      console.log("Submitting reply with auth:", !!authData.session)

      // Generate a temporary negative ID for the optimistic reply
      const tempId = -Math.floor(Math.random() * 1000000)

      // Use the provided parentId or the one from replyingTo state
      const actualParentId = parentId !== null ? parentId : replyingTo?.id || null

      // Add optimistic reply to UI immediately
      const optimisticReply: Reply = {
        id: tempId, // Temporary negative ID
        review_id: review.id,
        parent_id: actualParentId,
        user_id: user.id,
        author_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        content: replyContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        status: "approved",
        user_profile: {
          avatar_url: user.user_metadata?.avatar_url || null,
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

      // Submit directly to Supabase instead of using the server action
      const { data: insertedReply, error } = await supabase
        .from("review_replies")
        .insert({
          review_id: review.id,
          parent_id: actualParentId,
          user_id: user.id,
          author_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
          content: replyContent,
          likes: 0,
          dislikes: 0,
          status: "approved", // Set to approved for immediate display
        })
        .select()
        .single()

      if (error) {
        console.error("Error submitting reply:", error)
        setErrorMessage(`Failed to save reply: ${error.message}`)

        // Remove the optimistic reply
        if (optimisticReply.parent_id === null) {
          setLocalReplies((prev) => prev.filter((reply) => reply.id !== optimisticReply.id))
        } else {
          setLocalReplies((prev) => removeOptimisticNestedReply(prev, optimisticReply.id))
        }
      } else {
        // Clear the form after successful submission
        setReplyContent("")
        setReplyingTo(null)
        setSuccessMessage("Reply submitted successfully!")

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
      }

      // Clear the new reply ID after animation
      setTimeout(() => {
        setNewReplyId(null)
      }, 3000)
    } catch (error) {
      console.error("Error submitting reply:", error)
      setErrorMessage("Failed to submit reply. Please try again.")
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

  const handleVote = async (voteType: "like" | "dislike") => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    try {
      // Submit to server - the real-time subscription will handle the UI update
      const formData = new FormData()
      formData.append("reviewId", review.id.toString())
      formData.append("voteType", voteType)
      formData.append("serviceId", serviceId.toString())

      await submitVote(formData)
    } catch (error) {
      console.error("Error submitting vote:", error)
    }
  }

  const handleReplyVote = async (replyId: number, voteType: "like" | "dislike") => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    try {
      // Submit to server - the real-time subscription will handle the UI update
      const formData = new FormData()
      formData.append("replyId", replyId.toString())
      formData.append("voteType", voteType)
      formData.append("serviceId", serviceId.toString())

      await submitVote(formData)
    } catch (error) {
      console.error("Error submitting vote:", error)
    }
  }

  const handleAuthSuccess = async () => {
    setAuthModalOpen(false)
    setShowReplies(true) // Show replies section after login

    // Refresh the session after successful login
    await refreshSession()

    // Update authentication status
    const { data } = await supabase.auth.getSession()
    setIsAuthenticated(!!data.session)

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
    if (!user) {
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
        await refreshSession()

        // Force a new auth token to be used
        const { data: authData } = await supabase.auth.getSession()
        if (!authData.session) {
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
          user_id: user!.id,
          author_name: user!.user_metadata?.full_name || user!.email?.split("@")[0] || "User",
          content: inlineReplyContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes: 0,
          dislikes: 0,
          status: "approved",
          user_profile: {
            avatar_url: user!.user_metadata?.avatar_url || null,
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
            user_id: user!.id,
            author_name:
              user!.user_metadata?.full_name || user!.user_metadata?.name || user!.email?.split("@")[0] || "User",
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

          // Show success message
          setSuccessMessage("Reply submitted successfully!")
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
      <div className="mt-2 ml-6 mb-3">
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
          <div className="flex-1 flex items-end gap-2">
            <div className="flex-1 relative">
              <div className="absolute -top-6 left-0 text-xs text-gray-500 flex items-center">
                <span>Replying to {parentName}</span>
                <button
                  type="button"
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Textarea
                ref={inlineInputRef}
                placeholder={`Write a reply to ${parentName}...`}
                className="min-h-[60px] py-2 px-3 resize-none"
                value={inlineReplyContent}
                onChange={(e) => setInlineReplyContent(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-9 w-9 p-0 rounded-full"
              disabled={isInlinePending || !inlineReplyContent.trim()}
            >
              {isInlinePending ? <span className="animate-spin">⏳</span> : <Send className="h-4 w-4" />}
            </Button>
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
        initial={isNew ? { opacity: 0, y: -10 } : false}
        animate={isNew ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3 }}
        className={cn("flex flex-col", depth > 0 && "ml-6 mt-3")}
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
            <div className={cn("bg-gray-50 rounded-lg p-3 relative", isNew && "bg-blue-50 animate-pulse")}>
              {depth > 0 && <div className="absolute -left-4 top-4 w-3 h-0.5 bg-gray-200"></div>}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{reply.author_name}</span>
                <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
              </div>
              <p className="text-sm mt-1 break-words">{reply.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 ml-1">
              <button
                className={cn(
                  "flex items-center gap-1 text-xs hover:text-gray-900 transition-colors",
                  reply.likes > 0 ? "text-gray-900" : "text-gray-500",
                )}
                onClick={() => handleReplyVote(reply.id, "like")}
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
        {isReplying && user && <InlineReplyForm parentId={reply.id} parentName={reply.author_name} />}

        {/* Nested replies */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="pl-4 border-l-2 border-gray-100 ml-4 mt-2">
            {reply.replies.map((childReply) => (
              <ReplyThread key={childReply.id} reply={childReply} depth={depth + 1} />
            ))}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <Card key={review.id} className="overflow-hidden mb-4">
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
                  "flex items-center gap-1 text-xs hover:text-gray-900 transition-colors",
                  review.likes > 0 ? "text-gray-900" : "text-gray-500",
                )}
                onClick={() => handleVote("like")}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{review.likes > 0 ? review.likes : "Like"}</span>
              </button>
              <button
                className={cn(
                  "flex items-center gap-1 text-xs hover:text-gray-900 transition-colors",
                  review.dislikes > 0 ? "text-gray-900" : "text-gray-500",
                )}
                onClick={() => handleVote("dislike")}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>{review.dislikes > 0 ? review.dislikes : "Dislike"}</span>
              </button>
              <button
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
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
          <div className="px-4 pb-4 pt-2 border-t">
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
              <div className="space-y-4 mb-4">
                {localReplies.map((reply) => (
                  <ReplyThread key={reply.id} reply={reply} />
                ))}
              </div>
            )}

            {/* Main reply form - only show if not replying to a specific comment */}
            {user && !replyingTo && (
              <form
                ref={formRef}
                onSubmit={(e) => handleReplySubmit(e)}
                className="flex items-start gap-3"
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
                      className="min-h-[60px] py-2 px-3 resize-none"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full"
                    disabled={isPending || !replyContent.trim()}
                  >
                    {isPending ? <span className="animate-spin">⏳</span> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            )}

            {/* Sign in prompt if not logged in */}
            {!user && (
              <div
                className="flex items-center justify-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
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
