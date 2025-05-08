-- Create table to track review likes/dislikes if it doesn't exist
CREATE TABLE IF NOT EXISTS review_interactions (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Create table to track reply likes/dislikes if it doesn't exist
CREATE TABLE IF NOT EXISTS reply_interactions (
  id SERIAL PRIMARY KEY,
  reply_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS review_interactions_review_id_idx ON review_interactions(review_id);
CREATE INDEX IF NOT EXISTS review_interactions_user_id_idx ON review_interactions(user_id);
CREATE INDEX IF NOT EXISTS reply_interactions_reply_id_idx ON reply_interactions(reply_id);
CREATE INDEX IF NOT EXISTS reply_interactions_user_id_idx ON reply_interactions(user_id);
