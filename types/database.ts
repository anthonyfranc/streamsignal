export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      service_reviews: {
        Row: {
          created_at: string
          downvotes: number | null
          id: string
          service_id: string | null
          text: string | null
          upvotes: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          downvotes?: number | null
          id?: string
          service_id?: string | null
          text?: string | null
          upvotes?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          downvotes?: number | null
          id?: string
          service_id?: string | null
          text?: string | null
          upvotes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      review_votes: {
        Row: {
          id: string
          review_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          id?: string
          review_id: string
          user_id: string
          vote_type: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
