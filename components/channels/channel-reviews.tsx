"use client"

import { useState } from "react"
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChannelReviewsProps {
  channelId: number
}

export function ChannelReviews({ channelId }: ChannelReviewsProps) {
  const [reviewFilter, setReviewFilter] = useState("all")

  // Mock reviews data
  const reviews = [
    {
      id: 1,
      author: "Sarah Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      date: "2023-10-15",
      title: "Excellent channel",
      content:
        "This is one of my favorite channels. The programming is consistently high quality and there's always something interesting to watch.",
      likes: 24,
      dislikes: 2,
      replies: 3,
    },
    {
      id: 2,
      author: "Michael Chen",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4,
      date: "2023-09-22",
      title: "Great content, but too many ads",
      content:
        "I love the shows on this channel, but the frequency of commercial breaks can be frustrating. Otherwise, it's a solid option.",
      likes: 18,
      dislikes: 1,
      replies: 2,
    },
    {
      id: 3,
      author: "Jessica Williams",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 3,
      date: "2023-08-30",
      title: "Mixed feelings",
      content:
        "Some programs are excellent, others not so much. The inconsistency makes it hard to give a higher rating.",
      likes: 7,
      dislikes: 3,
      replies: 1,
    },
    {
      id: 4,
      author: "David Rodriguez",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 2,
      date: "2023-07-12",
      title: "Disappointing content lately",
      content:
        "The quality has declined over the past year. I used to watch this channel regularly, but now I rarely find anything worth watching.",
      likes: 5,
      dislikes: 8,
      replies: 4,
    },
  ]

  // Filter reviews based on selected filter
  const filteredReviews = reviews.filter((review) => {
    if (reviewFilter === "all") return true
    if (reviewFilter === "positive") return review.rating >= 4
    if (reviewFilter === "neutral") return review.rating === 3
    if (reviewFilter === "negative") return review.rating <= 2
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Tabs defaultValue="all" value={reviewFilter} onValueChange={setReviewFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="positive">Positive</TabsTrigger>
            <TabsTrigger value="neutral">Neutral</TabsTrigger>
            <TabsTrigger value="negative">Negative</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline">Write a Review</Button>
      </div>

      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No reviews found with the selected filter.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={review.avatar || "/placeholder.svg"} alt={review.author} />
                  <AvatarFallback>{review.author.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">{review.author}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= review.rating ? "text-black fill-black" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <h5 className="font-medium mt-2">{review.title}</h5>
                  <p className="text-sm mt-2">{review.content}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{review.likes}</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
                      <ThumbsDown className="h-3 w-3" />
                      <span>{review.dislikes}</span>
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
                      <MessageSquare className="h-3 w-3" />
                      <span>{review.replies} replies</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t pt-6 mt-8">
        <h3 className="font-semibold mb-4">Write a Review</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="rating" className="block text-sm font-medium mb-1">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} className="text-gray-300 hover:text-black">
                  <Star className="h-6 w-6" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Summarize your experience"
            />
          </div>
          <div>
            <label htmlFor="review" className="block text-sm font-medium mb-1">
              Review
            </label>
            <Textarea id="review" placeholder="Share your experience with this channel" className="min-h-[100px]" />
          </div>
          <Button>Submit Review</Button>
        </div>
      </div>
    </div>
  )
}
