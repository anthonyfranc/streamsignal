-- Create a table to track which reviews users have liked
CREATE TABLE IF NOT EXISTS review_likes (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES service_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS review_likes_user_id_idx ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS review_likes_review_id_idx ON review_likes(review_id);
