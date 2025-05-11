export interface ServiceTier {
  id: number
  service_id: number
  name: string
  price: number
  description: string
  features: string[]
  is_popular: boolean
  max_streams: number
  video_quality: string
  has_ads: boolean
  created_at: string
  sort_order: number
  // New promotional pricing fields
  promo_price: number | null
  promo_start_date: string | null
  promo_end_date: string | null
  promo_description: string | null
}

export interface CreateServiceTierInput {
  service_id: number
  name: string
  price: number
  description: string
  features: string[]
  is_popular: boolean
  max_streams: number
  video_quality: string
  has_ads: boolean
  sort_order: number
  // New promotional pricing fields
  promo_price?: number | null
  promo_start_date?: string | null
  promo_end_date?: string | null
  promo_description?: string | null
}

export interface UpdateServiceTierInput extends Partial<Omit<ServiceTier, "id" | "service_id" | "created_at">> {
  id: number
  service_id: number
}

// Helper functions for pricing
export function isPromotionActive(tier: ServiceTier): boolean {
  if (!tier.promo_price) return false
  const now = new Date()
  const startDate = tier.promo_start_date ? new Date(tier.promo_start_date) : null
  const endDate = tier.promo_end_date ? new Date(tier.promo_end_date) : null

  if (startDate && endDate) {
    return now >= startDate && now <= endDate
  }
  return false
}

export function getEffectivePrice(tier: ServiceTier): number {
  return isPromotionActive(tier) ? tier.promo_price || tier.price : tier.price
}

// Calculate savings amount and percentage
export function getPromotionalSavings(tier: ServiceTier): { amount: number; percentage: number } | null {
  if (!isPromotionActive(tier) || tier.promo_price === null) {
    return null
  }

  const amount = tier.price - tier.promo_price
  const percentage = (amount / tier.price) * 100

  return {
    amount,
    percentage,
  }
}
