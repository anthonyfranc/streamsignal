-- Function to get table information
CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(json_build_object(
    'column_name', column_name,
    'data_type', data_type,
    'is_nullable', is_nullable,
    'column_default', column_default
  ))
  INTO result
  FROM information_schema.columns
  WHERE table_name = $1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to increment a counter safely
CREATE OR REPLACE FUNCTION increment(row_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_value INTEGER;
BEGIN
  SELECT COALESCE(likes, 0) INTO current_value FROM service_reviews WHERE id = row_id;
  RETURN current_value + 1;
END;
$$ LANGUAGE plpgsql;

-- Check for constraints that might prevent self-likes
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_name = 'review_interactions'
    AND ccu.column_name IN ('review_id', 'user_id')
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Found unique constraint on review_interactions that might prevent self-likes';
  ELSE
    RAISE NOTICE 'No unique constraint found that would prevent self-likes';
  END IF;
END $$;

-- Add a diagnostic trigger to log interaction attempts
CREATE OR REPLACE FUNCTION log_interaction_attempt()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Interaction attempt: review_id=%, user_id=%, type=%', 
    NEW.review_id, NEW.user_id, NEW.interaction_type;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS interaction_logger ON review_interactions;

-- Create the trigger
CREATE TRIGGER interaction_logger
BEFORE INSERT OR UPDATE ON review_interactions
FOR EACH ROW EXECUTE FUNCTION log_interaction_attempt();
