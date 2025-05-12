-- Check if user_profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user_id is unique
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read user profiles
CREATE POLICY IF NOT EXISTS "User profiles are viewable by everyone" 
ON user_profiles FOR SELECT 
USING (true);

-- Users can update their own profiles
CREATE POLICY IF NOT EXISTS "Users can update own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profiles
CREATE POLICY IF NOT EXISTS "Users can insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);
