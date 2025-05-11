export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      channels: {
        Row: {
          category: string
          created_at: string
          id: number
          logo_url: string | null
          name: string
          popularity: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: number
          logo_url?: string | null
          name: string
          popularity: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: number
          logo_url?: string | null
          name?: string
          popularity?: number
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          category: string
          created_at: string
          filename: string
          file_size: number
          id: number
          mime_type: string
          original_filename: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          category: string
          created_at?: string
          filename: string
          file_size: number
          id?: number
          mime_type: string
          original_filename: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          category?: string
          created_at?: string
          filename?: string
          file_size?: number
          id?: number
          mime_type?: string
          original_filename?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: []
      }
      service_channels: {
        Row: {
          channel_id: number
          service_id: number
          tier: string
        }
        Insert: {
          channel_id: number
          service_id: number
          tier: string
        }
        Update: {
          channel_id?: number
          service_id?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_channels_channel_id_fkey"
            columns: ["channel_id"]
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_channels_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "streaming_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          id: number
          service_id: number
          user_id: string | null
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
          status: string
          moderated_by: string | null
          moderated_at: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: number
          service_id: number
          user_id?: string | null
          author_name: string
          rating: number
          title: string
          content: string
          interface_rating: number
          reliability_rating: number
          content_rating: number
          value_rating: number
          likes?: number
          dislikes?: number
          created_at?: string
          status?: string
          moderated_by?: string | null
          moderated_at?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: number
          service_id?: number
          user_id?: string | null
          author_name?: string
          rating?: number
          title?: string
          content?: string
          interface_rating?: number
          reliability_rating?: number
          content_rating?: number
          value_rating?: number
          likes?: number
          dislikes?: number
          created_at?: string
          status?: string
          moderated_by?: string | null
          moderated_at?: string | null
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "streaming_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_services: {
        Row: {
          created_at: string
          description: string | null
          features: string[]
          has_ads: boolean
          id: number
          logo_url: string | null
          max_streams: number
          monthly_price: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features: string[]
          has_ads: boolean
          id?: number
          logo_url?: string | null
          max_streams: number
          monthly_price: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[]
          has_ads?: boolean
          id?: number
          logo_url?: string | null
          max_streams?: number
          monthly_price?: number
          name?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          preferences: Json | null
          review_count: number
          is_admin: boolean
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json | null
          review_count?: number
          is_admin?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          preferences?: Json | null
          review_count?: number
          is_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
