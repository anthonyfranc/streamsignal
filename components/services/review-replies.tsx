"use client"

import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, ThumbsDown, Loader2, CornerDownRight, X, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { ReviewReply } from "@/types/reviews"
import { submitReviewReply, updateReplyLikes, deleteReviewReply, getReviewReplies } from "@/app/actions/reply-actions"
import { motion, AnimatePresence } from "framer-motion"

interface ReviewRepliesProps {
  reviewId: number
  initialReplies?: ReviewReply[]
  onAuthRequired: () => void
  onReplyAdded?: (reviewId: number, reply: ReviewReply) => void
}

export function ReviewReplies({ reviewId, initialReplies = [], onAuthRequired, onReplyAdded }: ReviewRepliesProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [replies, setReplies] = useState<ReviewReply[]>(initialReplies)
  const [replyContent, setReplyContent] = useState("")
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(initialReplies.length > 0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use refs to maintain stable references to state values
  const repliesRef = useRef<ReviewReply[]>(initialReplies)
  const mountedRef = useRef(true)
  const isFetchingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initializedRef = useRef(false)

  // Update the ref when replies change
  useEffect(() => {
    repliesRef.current = replies
  }, [replies])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Refresh replies from the server
  const refreshReplies = useCallback(async () => {
    // Prevent concurrent fetches and respect component lifecycle
    if (isFetchingRef.current || !mountedRef.current) {
      console.log(`Skipping refresh for review ${reviewId} - already fetching or unmounted`)
      return
    }

    try {
      isFetchingRef.current = true
      setIsRefreshing(true)
      console.log(`Refreshing replies for review ${reviewId}...`)

      const freshReplies = await getReviewReplies(reviewId)

      if (!mountedRef.current) return

      console.log(`Received ${freshReplies.length} replies for review ${reviewId}`)

      // Only update if we got a valid response
      if (Array.isArray(freshReplies)) {
        // Sort replies by created_at to ensure consistent order
        const sortedReplies = [...freshReplies].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )

        // Check if the data is actually different to avoid unnecessary re-renders
        const currentRepliesJson = JSON.stringify(repliesRef.current.map((r) => r.id))
        const newRepliesJson = JSON.stringify(sortedReplies.map((r) => r.id))

        if (currentRepliesJson !== newRepliesJson || repliesRef.current.length !== sortedReplies.length) {
          console.log(`Updating replies state with ${sortedReplies.length} replies`)
          setReplies(sortedReplies)
        } else {
          console.log("Replies unchanged, skipping update")
        }
      }
    } catch (error) {
      console.error("Error refreshing replies:", error)
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false)
      }

      // Set a cooldown before allowing another fetch
      timeoutRef.current = setTimeout(() => {
        isFetchingRef.current = false
      }, 5000) // 5 second cooldown
    }
  }, [reviewId])

  // Effect to refresh replies when they're shown - only run once when showReplies changes to true
  useEffect(() => {
    // Only fetch if:
    // 1. Replies are being shown
    // 2. Not already fetching
    // 3. Component is mounted
    // 4. We haven't initialized yet OR showReplies just changed to true
    if (showReplies && !isFetchingRef.current && mountedRef.current) {
      if (!initializedRef.current) {
        console.log(`Initializing replies for review ${reviewId}`)
        initializedRef.current = true

        // If we have initial replies, don't fetch again
        if (initialReplies.length === 0) {
          refreshReplies()
        }
      }
    }
  }, [showReplies, refreshReplies, initialReplies.length, reviewId])

  // Handle reply submission
  const handleSubmitReply = async () => {
    if (!user) {
      onAuthRequired()
      return
    }

    if (!replyContent.trim() || replyContent.trim().length < 3) {
      toast({
        title: "Error",
        description: "Reply must be at least 3 characters long.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("reviewId", reviewId.toString())
    formData.append("content", replyContent)

    // Pass user information to help with server-side auth issues
    if (user.id) {
      formData.append("userId", user.id)
    }

    // Pass author name as fallback
    let authorName = "Anonymous"
    if (user.user_metadata?.name) {
      authorName = user.user_metadata.name as string
    } else if (user.user_metadata?.full_name) {
      authorName = user.user_metadata.full_name as string
    } else if (user.email) {
      authorName = user.email.split("@")[0] as string
    }
    formData.append("authorName", authorName)

    // Create a temporary optimistic reply
    const optimisticReply: ReviewReply = {
      id: -1, // Temporary ID
      review_id: reviewId,
      user_id: user.id,
      author_name: authorName,
      content: replyContent.trim(),
      likes: 0,
      dislikes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Store the content for potential rollback
    const submittedContent = replyContent

    // Clear the form immediately for better UX
    setReplyContent("")

    // Add optimistic reply to the UI
    const updatedReplies = [...repliesRef.current, optimisticReply]
    setReplies(updatedReplies)
    setShowReplies(true)
    setShowReplyForm(false)

    startTransition(async () => {
      try {
        const result = await submitReviewReply(formData)

        if (result.success && result.reply) {
          console.log("Reply submitted successfully:", result.reply)

          // Replace the optimistic reply with the real one
          const finalReplies = repliesRef.current.map((reply) => (reply.id === -1 ? result.reply! : reply))

          if (mountedRef.current) {
            setReplies(finalReplies)

            // Notify parent component about the new reply
            if (onReplyAdded) {
              onReplyAdded(reviewId, result.reply)
            }

            toast({
              title: "Success",
              description: result.message,
            })
          }

          // Allow a refresh after submission
          isFetchingRef.current = false
        } else {
          // Handle error - remove optimistic reply
          if (mountedRef.current) {
            setReplies(repliesRef.current.filter((reply) => reply.id !== -1))

            // Restore the form content so the user doesn't lose their input
            setReplyContent(submittedContent)
            setShowReplyForm(true)

            // Only call onAuthRequired if explicitly told authentication is needed
            if (result.requireAuth) {
              onAuthRequired()
            } else {
              toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
              })
            }
          }
        }
      } catch (error) {
        console.error("Error in reply submission:", error)

        if (mountedRef.current) {
          // Remove optimistic reply on error
          setReplies(repliesRef.current.filter((reply) => reply.id !== -1))

          // Restore the form content
          setReplyContent(submittedContent)
          setShowReplyForm(true)

          toast({
            title: "Error",
            description: "Failed to submit reply. Please try again.",
            variant: "destructive",
          })
        }
      }
    })
  }

  // Handle like/dislike actions
  const handleReplyRating = async (replyId: number, action: "like" | "dislike") => {
    if (!user) {
      onAuthRequired()
      return
    }

    // Create a stable copy for optimistic update
    const currentReplies = [...repliesRef.current]

    // Optimistically update UI
    setReplies(
      currentReplies.map((reply) => {
        if (reply.id === replyId) {
          return {
            ...reply,
            likes: action === "like" ? reply.likes + 1 : reply.likes,
            dislikes: action === "dislike" ? reply.dislikes + 1 : reply.dislikes,
          }
        }
        return reply
      }),
    )

    try {
      // Send request to server
      const result = await updateReplyLikes(replyId, action)

      if (!result.success) {
        if (result.requireAuth) {
          onAuthRequired()
          // Revert to original state
          if (mountedRef.current) {
            setReplies(currentReplies)
          }
        } else {
          if (mountedRef.current) {
            toast({
              title: "Error",
              description: result.message,
              variant: "destructive",
            })
            // Revert to original state
            setReplies(currentReplies)
          }
        }
      }
    } catch (error) {
      console.error("Error updating reply rating:", error)
      if (mountedRef.current) {
        // Revert to original state on error
        setReplies(currentReplies)
        toast({
          title: "Error",
          description: "Failed to update rating. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Handle reply deletion
  const handleDeleteReply = async (replyId: number) => {
    if (!user) {
      return
    }

    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this reply?")) {
      return
    }

    // Create a stable copy for reverting if needed
    const currentReplies = [...repliesRef.current]
    const replyToDelete = currentReplies.find((r) => r.id === replyId)

    if (!replyToDelete) {
      return
    }

    // Optimistically remove from UI
    setReplies(currentReplies.filter((reply) => reply.id !== replyId))

    startTransition(async () => {
      try {
        const result = await deleteReviewReply(replyId)

        if (result.success) {
          if (mountedRef.current) {
            toast({
              title: "Success",
              description: result.message,
            })
          }
        } else {
          if (mountedRef.current) {
            toast({
              title: "Error",
              description: result.message,
              variant: "destructive",
            })
            // Revert to original state
            setReplies(currentReplies)
          }
        }
      } catch (error) {
        console.error("Error deleting reply:", error)
        if (mountedRef.current) {
          // Revert to original state on error
          setReplies(currentReplies)
          toast({
            title: "Error",
            description: "Failed to delete reply. Please try again.",
            variant: "destructive",
          })
        }
      }
    })
  }

  // Toggle reply form visibility
  const toggleReplyForm = () => {
    if (!user) {
      onAuthRequired()
      return
    }

    setShowReplyForm(!showReplyForm)
  }

  // Toggle replies visibility
  const toggleReplies = () => {
    setShowReplies(!showReplies)
  }

  // Manual refresh handler
  const handleManualRefresh = () => {
    if (!isFetchingRef.current) {
      isFetchingRef.current = false // Reset the flag
      refreshReplies()
    }
  }

  return (
    <div className="mt-2 pl-4 border-l-2 border-gray-100">
      {replies.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={toggleReplies}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            {showReplies ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>
                  Hide {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>
                  Show {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </span>
              </>
            )}
          </button>

          {showReplies && (
            <button
              onClick={handleManualRefresh}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              disabled={isRefreshing}
            >
              <Loader2 className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {isRefreshing && replies.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading replies...</span>
              </div>
            ) : replies.length > 0 ? (
              replies.map((reply) => (
                <div key={reply.id === -1 ? "optimistic-reply" : reply.id} className="flex gap-3 pb-3">
                  <CornerDownRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={`/abstract-geometric-shapes.png?height=24&width=24&query=${reply.author_name}`}
                          alt={reply.author_name}
                        />
                        <AvatarFallback>{reply.author_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{reply.author_name}</span>
                            <span className="text-xs text-gray-500">
                              {reply.id === -1 ? "Submitting..." : formatDate(reply.created_at)}
                            </span>
                          </div>
                          {user && user.id === reply.user_id && reply.id !== -1 && (
                            <button
                              onClick={() => handleDeleteReply(reply.id)}
                              className="text-gray-400 hover:text-red-500"
                              aria-label="Delete reply"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm mt-1">{reply.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          {reply.id !== -1 && (
                            <>
                              <button
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                                onClick={() => handleReplyRating(reply.id, "like")}
                                disabled={!user}
                              >
                                <ThumbsUp className="h-3 w-3" />
                                <span>{reply.likes}</span>
                              </button>
                              <button
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                                onClick={() => handleReplyRating(reply.id, "dislike")}
                                disabled={!user}
                              >
                                <ThumbsDown className="h-3 w-3" />
                                <span>{reply.dislikes}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 py-2">No replies yet. Be the first to reply!</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3">
        {!showReplyForm ? (
          <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={toggleReplyForm}>
            <CornerDownRight className="h-3.5 w-3.5 mr-1" />
            Reply
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <CornerDownRight className="h-4 w-4 text-gray-400 mt-1" />
              <div className="flex-1">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setShowReplyForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleSubmitReply}
                    disabled={isPending || !replyContent.trim()}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Reply"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
