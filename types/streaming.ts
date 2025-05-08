export interface StreamingService {
  id: number
  name: string
  logo_url: string | null
  monthly_price: number
  description: string | null
  features: string[]
  max_streams: number
  has_ads: boolean
  created_at: string
  content_structure_type: "channels" | "categories" | "hybrid" | "add_ons"
  channel_count?: number
  selected_channels_count?: number
  has_4k?: boolean
  device_compatibility?: DeviceCompatibility
  key_features?: string[]
  devices?: string[]
}

export interface DeviceCompatibility {
  smart_tv: boolean
  mobile: boolean
  web: boolean
  gaming_console: boolean
  streaming_device: boolean
}

export interface Channel {
  id: number
  name: string
  logo_url: string | null
  category: string
  popularity: number
  created_at: string
  selected?: boolean
  tier?: string
  language?: string
  description?: string
}

export interface ServiceChannel {
  service_id: number
  channel_id: number
  tier: string
}

export interface ChannelWithServices extends Channel {
  services: {
    id: number
    name: string
    logo_url: string | null
    monthly_price: number
    tier: string
  }[]
}

export interface ContentCategory {
  id: number
  service_id: number
  name: string
  description: string | null
  created_at: string
  items?: ContentItem[]
}

export interface ContentItem {
  id: number
  category_id: number
  title: string
  description: string | null
  image_url: string | null
  content_type: string | null
  year?: number
  rating?: string
  duration_minutes?: number
  display_order: number
  created_at: string
}

export interface AddonService {
  id: number
  parent_service_id: number
  addon_service_id: number
  price_addition: number
  created_at: string
  addon_service?: StreamingService
}

export type Service = StreamingService
