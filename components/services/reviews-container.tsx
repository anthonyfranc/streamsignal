import { getServiceReviews, getReviewCount } from "@/app/actions/review-actions"
import { ServiceReviews } from "./service-reviews"
import { AuthDebugPanel } from "@/components/auth/auth-debug"

interface ReviewsContainerProps {
  serviceId: number
  serviceName?: string
}

export async function ReviewsContainer({ serviceId, serviceName }: ReviewsContainerProps) {
  // Fetch initial reviews and count on the server
  const initialReviews = await getServiceReviews(serviceId)
  const reviewCount = await getReviewCount(serviceId)

  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <>
      {isDevelopment && <AuthDebugPanel />}
      <ServiceReviews
        serviceId={serviceId}
        initialReviews={initialReviews}
        initialCount={reviewCount}
        serviceName={serviceName}
      />
    </>
  )
}
