-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB,
  review_count INTEGER DEFAULT 0 NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create RLS policies for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read any profile
CREATE POLICY "Users can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (true);

-- Policy for users to update only their own profile
CREATE POLICY "Users can update own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Policy for users to insert only their own profile
CREATE POLICY "Users can insert own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create a function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to update review_count
CREATE OR REPLACE FUNCTION public.increment_review_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET review_count = review_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to increment review_count when a new review is created
DROP TRIGGER IF EXISTS on_review_created ON public.service_reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.service_reviews
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.increment_review_count();
