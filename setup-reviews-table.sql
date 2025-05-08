-- Create review reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS "review_reactions" (
  "id" SERIAL PRIMARY KEY,
  "review_id" INTEGER NOT NULL REFERENCES "service_reviews"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "reaction_type" TEXT NOT NULL CHECK ("reaction_type" IN ('like', 'dislike')),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("review_id", "user_id")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_reactions_review_id ON review_reactions(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reactions_user_id ON review_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reactions_type ON review_reactions(reaction_type);

-- Update the service_reviews table to include counts
ALTER TABLE service_reviews
ADD COLUMN IF NOT EXISTS "likes" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "dislikes" INTEGER DEFAULT 0;
