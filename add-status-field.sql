-- Add status field to service_reviews table
ALTER TABLE service_reviews 
ADD COLUMN status VARCHAR(20) DEFAULT 'approved';

-- Update existing reviews to have the approved status
UPDATE service_reviews
SET status = 'approved'
WHERE status IS NULL;

-- Add an index for faster filtering by status
CREATE INDEX idx_service_reviews_status ON service_reviews(status);
