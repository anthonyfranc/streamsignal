export interface ReviewComment {
  id: number
  review_id: number | null
  parent_comment_id: number | null
  user_id: string
  author_name: string
  author_avatar?: string | null
  content: string
  likes: number
  dislikes: number
  created_at: string
  updated_at: string | null
  nesting_level: number
  replies: ReviewComment[]
  user_reaction: "like" | "dislike" | null
}

export interface ServiceReview {
  id: number
  service_id: number
  user_id: string
  author_name: string
  author_avatar?: string | null
  rating: number
  title: string | null
  content: string
  interface_rating: number | null
  reliability_rating: number | null
  content_rating: number | null
  value_rating: number | null
  likes: number
  dislikes: number
  created_at: string
}

// Add utility types for safer data handling
export type SafeReviewComment = Partial<ReviewComment> & { id: number }
export type SafeServiceReview = Partial<ServiceReview> & { id: number; service_id: number }
