"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Star, ThumbsUp, ThumbsDown, MessageSquare, X, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { submitReviewReply } from "@/app/actions/reply-actions"
import { submitVote } from "@/app/actions/vote-actions"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { cn } from "@/lib/utils"
import type { Review, Reply } from "@/types/reviews"
import { formatDistanceToNow } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime"

interface ReviewItemProps {
  review: Review
  serviceId: number
  replies: Reply[]
}

export function ReviewItem({ review, serviceId, replies: initialReplies }: ReviewItemProps) {
  const { user, session } = useAuth()
  const [replyingTo, setReplyingTo] = useState<{ id: number | null; name: string } | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [localReplies, setLocalReplies] = useState<Reply[]>(initialReplies)
  const formRef = useRef<HTMLFormElement>(null)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)
  const newReplyRef = useRef<HTMLDivElement>(null)
  const [newReplyId, setNewReplyId] = useState<number | null>(null)

  // Set up real-time subscription for replies to this review
  useSupabaseRealtime<Reply>("review_replies", "*", { column: "review_id", value: review.id }, async (payload) => {
    if (payload.new && payload.new.status === "approved") {
      // For new replies, fetch the user profile
      if (payload.eventType === "INSERT") {
        const reply = payload.new
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
        setLocalReplies((prev) => updateReplyInThread(prev, payload.new.id, payload.new))
      }
      // For deleted replies, remove from local state
      else if (payload.eventType === "DELETE" && payload.old) {
        setLocalReplies((prev) => removeReplyFromThread(prev, payload.old.id))
      }
    }
  })

  // Set up real-time subscription for votes on this review
  useSupabaseRealtime("review_votes", "*", { column: "review_id", value: review.id }, (payload) => {
    // We'll handle vote updates by fetching the latest counts
    if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
      fetchReviewVoteCounts()
    }
  })

  // Initialize with the provided replies
  useEffect(() => {
    setLocalReplies(initialReplies)
  }, [initialReplies])

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

  const handleReplySubmit = async (event: React.FormEvent) => {
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

    try {
      // Create form data for submission
      const formData = new FormData()
      formData.append("serviceId", serviceId.toString())
      formData.append("reviewId", review.id.toString())
      formData.append("content", replyContent)

      if (replyingTo && replyingTo.id !== null) {
        formData.append("parentId", replyingTo.id.toString())
      }

      // Add user information to help debug
      formData.append("userId", user.id)
      formData.append("userEmail", user.email || "")

      // Submit to server - the real-time subscription will handle the UI update
      const result = await submitReviewReply(formData)

      if (!result.success) {
        if (result.requireAuth) {
          // If the server says we need auth, refresh the session
          await supabase.auth.refreshSession()
          setErrorMessage("Session refreshed. Please try again.")
        } else {
          setErrorMessage(`Failed to save reply: ${result.message}`)
        }
      } else {
        // Clear the form after successful submission
        setReplyContent("")
        setReplyingTo(null)

        // Optimistically add the reply to the UI
        const newReply: Reply = {
          id: result.replyId || Math.random() * -1000, // Temporary ID if server didn't return one
          review_id: review.id,
          parent_id: replyingTo?.id || null,
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
        if (newReply.parent_id === null) {
          setLocalReplies((prev) => [...prev, newReply])
        } else {
          setLocalReplies((prev) => addNestedReply(prev, newReply.parent_id!, newReply))
        }

        // Set as new reply for animation
        setNewReplyId(newReply.id)

        // Clear the new reply ID after animation
        setTimeout(() => {
          setNewReplyId(null)
        }, 3000)
      }
    } catch (error) {
      console.error("Error submitting reply:", error)
      setErrorMessage("Failed to submit reply. Please try again.")
    } finally {
      setIsPending(false)
    }
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

  const handleAuthSuccess = () => {
    setAuthModalOpen(false)
    setShowReplies(true) // Show replies section after login

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

  // Recursive component for rendering replies
  const ReplyThread = ({ reply, depth = 0 }: { reply: Reply; depth?: number }) => {
    const maxDepth = 3 // Maximum nesting level
    const isNew = reply.id === newReplyId
    const replyRef = isNew ? newReplyRef : null

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
            </AnimatePresence>

            {localReplies.length > 0 && (
              <div className="space-y-4 mb-4">
                {localReplies.map((reply) => (
                  <ReplyThread key={reply.id} reply={reply} />
                ))}
              </div>
            )}

            {/* Facebook-style Reply Form */}
            {user ? (
              <form
                ref={formRef}
                onSubmit={handleReplySubmit}
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
                  <div className="flex-1 relative">
                    {replyingTo && (
                      <div className="absolute -top-6 left-0 text-xs text-gray-500 flex items-center">
                        <span>Replying to {replyingTo.name}</span>
                        <button
                          type="button"
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          onClick={() => setReplyingTo(null)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <Textarea
                      ref={replyInputRef}
                      placeholder={
                        replyingTo
                          ? `Write a reply to ${replyingTo.name}...`
                          : `Write a comment, ${user?.user_metadata?.full_name?.split(" ")[0] || "there"}...`
                      }
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
            ) : (
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
