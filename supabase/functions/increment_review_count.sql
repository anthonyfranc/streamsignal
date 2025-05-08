-- Create a function to increment a user's review count
CREATE OR REPLACE FUNCTION increment_review_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET review_count = review_count + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
