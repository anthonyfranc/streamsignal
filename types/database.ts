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
