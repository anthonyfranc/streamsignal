export interface ReviewReply {
  id: number
  review_id: number
  user_id: string
  author_name: string
  content: string
  likes: number
  dislikes: number
  created_at: string
  updated_at: string
}
