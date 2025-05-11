-- Update RLS policies for review_votes table to be more permissive
ALTER TABLE review_votes DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with more permissive policies
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Create policy that allows authenticated users to insert
CREATE POLICY "Allow authenticated users to insert votes"
ON review_votes
FOR INSERT
TO authenticated
USING (true);

-- Create policy that allows users to update their own votes
CREATE POLICY "Allow users to update their own votes"
ON review_votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy that allows users to delete their own votes
CREATE POLICY "Allow users to delete their own votes"
ON review_votes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create policy that allows anyone to select votes
CREATE POLICY "Allow anyone to select votes"
ON review_votes
FOR SELECT
TO authenticated, anon
USING (true);
