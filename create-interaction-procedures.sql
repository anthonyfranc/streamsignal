-- Create a function to update review interactions atomically
CREATE OR REPLACE FUNCTION update_review_interaction(
  p_review_id INTEGER,
  p_user_id UUID,
  p_interaction_type TEXT,
  p_previous_interaction TEXT
) RETURNS VOID AS $$
DECLARE
  v_service_id INTEGER;
BEGIN
  -- Get service_id for the review
  SELECT service_id INTO v_service_id FROM service_reviews WHERE id = p_review_id;
  
  -- Update like/dislike counts based on previous and new interaction
  IF p_previous_interaction IS NULL THEN
    -- New interaction
    IF p_interaction_type = 'like' THEN
      UPDATE service_reviews SET likes = likes + 1 WHERE id = p_review_id;
    ELSE
      UPDATE service_reviews SET dislikes = dislikes + 1 WHERE id = p_review_id;
    END IF;
  ELSIF p_previous_interaction = p_interaction_type THEN
    -- Same interaction, do nothing (this shouldn't happen with client validation)
    RETURN;
  ELSE
    -- Changed interaction (from like to dislike or vice versa)
    IF p_previous_interaction = 'like' AND p_interaction_type = 'dislike' THEN
      UPDATE service_reviews 
      SET likes = GREATEST(0, likes - 1), dislikes = dislikes + 1 
      WHERE id = p_review_id;
    ELSIF p_previous_interaction = 'dislike' AND p_interaction_type = 'like' THEN
      UPDATE service_reviews 
      SET dislikes = GREATEST(0, dislikes - 1), likes = likes + 1 
      WHERE id = p_review_id;
    END IF;
    
    -- Delete the old interaction
    DELETE FROM review_interactions 
    WHERE review_id = p_review_id AND user_id = p_user_id;
  END IF;
  
  -- Insert the new interaction
  INSERT INTO review_interactions (review_id, user_id, interaction_type)
  VALUES (p_review_id, p_user_id, p_interaction_type);
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where record already exists
    UPDATE review_interactions 
    SET interaction_type = p_interaction_type
    WHERE review_id = p_review_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a similar function for reply interactions
CREATE OR REPLACE FUNCTION update_reply_interaction(
  p_reply_id INTEGER,
  p_user_id UUID,
  p_interaction_type TEXT,
  p_previous_interaction TEXT
) RETURNS VOID AS $$
DECLARE
  v_review_id INTEGER;
BEGIN
  -- Get review_id for the reply
  SELECT review_id INTO v_review_id FROM review_replies WHERE id = p_reply_id;
  
  -- Update like/dislike counts based on previous and new interaction
  IF p_previous_interaction IS NULL THEN
    -- New interaction
    IF p_interaction_type = 'like' THEN
      UPDATE review_replies SET likes = likes + 1 WHERE id = p_reply_id;
    ELSE
      UPDATE review_replies SET dislikes = dislikes + 1 WHERE id = p_reply_id;
    END IF;
  ELSIF p_previous_interaction = p_interaction_type THEN
    -- Same interaction, do nothing
    RETURN;
  ELSE
    -- Changed interaction (from like to dislike or vice versa)
    IF p_previous_interaction = 'like' AND p_interaction_type = 'dislike' THEN
      UPDATE review_replies 
      SET likes = GREATEST(0, likes - 1), dislikes = dislikes + 1 
      WHERE id = p_reply_id;
    ELSIF p_previous_interaction = 'dislike' AND p_interaction_type = 'like' THEN
      UPDATE review_replies 
      SET dislikes = GREATEST(0, dislikes - 1), likes = likes + 1 
      WHERE id = p_reply_id;
    END IF;
    
    -- Delete the old interaction
    DELETE FROM reply_interactions 
    WHERE reply_id = p_reply_id AND user_id = p_user_id;
  END IF;
  
  -- Insert the new interaction
  INSERT INTO reply_interactions (reply_id, user_id, interaction_type)
  VALUES (p_reply_id, p_user_id, p_interaction_type);
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where record already exists
    UPDATE reply_interactions 
    SET interaction_type = p_interaction_type
    WHERE reply_id = p_reply_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
