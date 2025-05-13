export interface ServiceReview {
  id: number
  service_id: number
  user_id?: string
  author_name: string
  author_avatar?: string
  rating: number
  title: string
  content: string
  interface_rating?: number | null
  reliability_rating?: number | null
  content_rating?: number | null
  value_rating?: number | null
  likes: number
  dislikes: number
  created_at: string
  updated_at?: string | null
}

export interface ReviewComment {
  id: number
  review_id: number | null
  parent_comment_id: number | null
  user_id: string
  author_name: string
  author_avatar?: string
  content: string
  likes: number
  dislikes: number
  created_at: string
  updated_at?: string | null
  nesting_level?: number
  replies?: ReviewComment[]
  user_reaction?: string | null
  isOptimistic?: boolean
  isCollapsed?: boolean
}

export interface SafeServiceReview {
  id: number
  service_id: number
  user_id?: string
  author_name?: string
  author_avatar?: string
  rating?: number
  title?: string
  content?: string
  interface_rating?: number | null
  reliability_rating?: number | null
  content_rating?: number | null
  value_rating?: number | null
  likes?: number
  dislikes?: number
  created_at?: string
  updated_at?: string | null
}

export interface SafeReviewComment {
  id: number
  review_id?: number | null
  parent_comment_id?: number | null
  user_id?: string
  author_name?: string
  author_avatar?: string
  content?: string
  likes?: number
  dislikes?: number
  created_at?: string
  updated_at?: string | null
  nesting_level?: number
  replies?: ReviewComment[]
  user_reaction?: string | null
  isOptimistic?: boolean
  isCollapsed?: boolean
}

export interface ReviewReaction {
  id: number
  user_id: string
  review_id: number
  reaction_type: string
  created_at: string
}

export interface CommentReaction {
  id: number
  user_id: string
  comment_id: number
  reaction_type: string
  created_at: string
}
