-- Function to check table constraints
CREATE OR REPLACE FUNCTION get_table_constraints(table_name TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(json_build_object(
    'constraint_name', tc.constraint_name,
    'constraint_type', tc.constraint_type,
    'columns', string_agg(ccu.column_name, ', ')
  ))
  INTO result
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = $1
  GROUP BY tc.constraint_name, tc.constraint_type;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a stored procedure exists
CREATE OR REPLACE FUNCTION check_function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = $1
  ) INTO func_exists;
  
  RETURN func_exists;
END;
$$ LANGUAGE plpgsql;

-- Add detailed logging to the update_review_interaction function
CREATE OR REPLACE FUNCTION update_review_interaction(
  p_review_id INTEGER,
  p_user_id UUID,
  p_interaction_type TEXT,
  p_previous_interaction TEXT
) RETURNS VOID AS $$
DECLARE
  v_service_id INTEGER;
  v_review_owner UUID;
  v_is_self_like BOOLEAN;
BEGIN
  -- Get review info
  SELECT service_id, user_id INTO v_service_id, v_review_owner 
  FROM service_reviews WHERE id = p_review_id;
  
  -- Check if this is a self-like
  v_is_self_like := (v_review_owner = p_user_id);
  
  RAISE NOTICE 'Processing % for review % by user %. Self-like: %', 
    p_interaction_type, p_review_id, p_user_id, v_is_self_like;
  
  -- Update like/dislike counts based on previous and new interaction
  IF p_previous_interaction IS NULL THEN
    -- New interaction
    RAISE NOTICE 'New interaction: %', p_interaction_type;
    IF p_interaction_type = 'like' THEN
      UPDATE service_reviews SET likes = likes + 1 WHERE id = p_review_id;
    ELSE
      UPDATE service_reviews SET dislikes = dislikes + 1 WHERE id = p_review_id;
    END IF;
  ELSIF p_previous_interaction = p_interaction_type THEN
    -- Same interaction, do nothing (this shouldn't happen with client validation)
    RAISE NOTICE 'Duplicate interaction attempt: %', p_interaction_type;
    RETURN;
  ELSE
    -- Changed interaction (from like to dislike or vice versa)
    RAISE NOTICE 'Changed interaction from % to %', p_previous_interaction, p_interaction_type;
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
  BEGIN
    INSERT INTO review_interactions (review_id, user_id, interaction_type)
    VALUES (p_review_id, p_user_id, p_interaction_type);
    RAISE NOTICE 'Successfully inserted interaction record';
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle case where record already exists
      RAISE NOTICE 'Unique violation caught, updating existing record';
      UPDATE review_interactions 
      SET interaction_type = p_interaction_type
      WHERE review_id = p_review_id AND user_id = p_user_id;
    WHEN OTHERS THEN
      -- Log any other errors
      RAISE NOTICE 'Error inserting interaction: % - %', SQLERRM, SQLSTATE;
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Check and fix the review_interactions table
DO $$
DECLARE
  constraint_exists BOOLEAN;
  constraint_name TEXT;
BEGIN
  -- Check if the unique constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_name = 'review_interactions'
    AND array_to_string(array_agg(ccu.column_name), ',') LIKE '%review_id%user_id%'
  ), constraint_name INTO constraint_exists, constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'UNIQUE' 
  AND tc.table_name = 'review_interactions'
  GROUP BY tc.constraint_name;
  
  RAISE NOTICE 'Unique constraint exists: %, name: %', constraint_exists, constraint_name;
  
  -- If the constraint doesn't exist, add it
  IF NOT constraint_exists THEN
    RAISE NOTICE 'Adding unique constraint on review_id and user_id';
    ALTER TABLE review_interactions ADD CONSTRAINT review_interactions_review_user_unique UNIQUE (review_id, user_id);
  END IF;
  
  -- Ensure we have the proper indexes
  CREATE INDEX IF NOT EXISTS review_interactions_review_id_idx ON review_interactions(review_id);
  CREATE INDEX IF NOT EXISTS review_interactions_user_id_idx ON review_interactions(user_id);
  
  -- Add a trigger for logging
  CREATE OR REPLACE FUNCTION log_interaction_changes()
  RETURNS TRIGGER AS $$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      RAISE NOTICE 'New interaction: review=%, user=%, type=%', 
        NEW.review_id, NEW.user_id, NEW.interaction_type;
    ELSIF TG_OP = 'UPDATE' THEN
      RAISE NOTICE 'Updated interaction: review=%, user=%, type=% -> %', 
        NEW.review_id, NEW.user_id, OLD.interaction_type, NEW.interaction_type;
    ELSIF TG_OP = 'DELETE' THEN
      RAISE NOTICE 'Deleted interaction: review=%, user=%, type=%', 
        OLD.review_id, OLD.user_id, OLD.interaction_type;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  -- Drop the trigger if it exists and recreate it
  DROP TRIGGER IF EXISTS log_interaction_changes ON review_interactions;
  CREATE TRIGGER log_interaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON review_interactions
  FOR EACH ROW EXECUTE FUNCTION log_interaction_changes();
  
  RAISE NOTICE 'Review interactions table setup complete';
END $$;

-- Function to fix review counts
CREATE OR REPLACE FUNCTION fix_review_counts()
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM service_reviews LOOP
    -- Calculate actual like counts
    UPDATE service_reviews
    SET likes = (
      SELECT COUNT(*) FROM review_interactions
      WHERE review_id = r.id AND interaction_type = 'like'
    ),
    dislikes = (
      SELECT COUNT(*) FROM review_interactions
      WHERE review_id = r.id AND interaction_type = 'dislike'
    )
    WHERE id = r.id;
  END LOOP;
  
  RAISE NOTICE 'Review counts fixed';
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT fix_review_counts();
