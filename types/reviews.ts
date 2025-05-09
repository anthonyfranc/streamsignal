export interface Review {
  id: number
  service_id: number
  user_id: string
  author_name: string
  rating: number
  title: string
  content: string
  interface_rating: number
  reliability_rating: number
  content_rating: number
  value_rating: number
  likes: number
  dislikes: number
  created_at: string
  status: "pending" | "approved" | "rejected"
  user_profile?: {
    avatar_url: string | null
  }
}

export interface ReviewSubmission {
  serviceId: number
  authorName: string
  rating: number
  title: string
  content: string
  interfaceRating: number
  reliabilityRating: number
  contentRating: number
  valueRating: number
}

export interface Reply {
  id: number
  review_id: number
  parent_id: number | null
  user_id: string
  author_name: string
  content: string
  likes: number
  dislikes: number
  created_at: string
  status: "pending" | "approved" | "rejected"
  user_profile?: {
    avatar_url: string | null
  }
  replies?: Reply[]
}

export interface ReplySubmission {
  reviewId: number
  parentId?: number | null
  authorName: string
  content: string
}

export interface VoteSubmission {
  reviewId?: number
  replyId?: number
  voteType: "like" | "dislike"
}

export interface ReviewRatings {
  overall: number
  interface: number
  reliability: number
  content: number
  value: number
}
