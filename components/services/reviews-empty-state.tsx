"use client"

import { MessageSquare, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"

interface ReviewsEmptyStateProps {
  onWriteReview: () => void
  serviceName?: string
}

export function ReviewsEmptyState({ onWriteReview, serviceName = "this service" }: ReviewsEmptyStateProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-dashed border-gray-300 bg-gray-50">
        <CardContent className="flex flex-col items-center text-center p-8 md:p-12">
          <div className="rounded-full bg-gray-100 p-4 mb-6">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>

          <h3 className="text-xl font-semibold mb-2">No Reviews Yet</h3>

          <p className="text-gray-500 mb-6 max-w-md">
            It looks like no one has reviewed {serviceName} yet. Be the first to share your experience and help others
            make informed decisions.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-6 w-6 text-gray-300" />
            ))}
          </div>

          <Button onClick={onWriteReview} size="lg" className="px-6">
            Be the First to Review
          </Button>

          <p className="text-xs text-gray-400 mt-4">
            Your honest feedback helps the community make better streaming choices
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
