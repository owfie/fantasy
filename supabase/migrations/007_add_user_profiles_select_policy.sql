-- Add RLS policies to user_profiles table
-- This allows viewing user profiles (for fantasy team ownership display)

-- Allow anyone to view user profiles (needed for displaying team owners)
-- Note: Only non-sensitive fields (id, email, display_name, is_admin) should be selected
CREATE POLICY "User profiles are viewable by everyone" 
  ON user_profiles 
  FOR SELECT 
  USING (true);

-- Allow admins to manage user profiles (insert, update, delete)
-- Uses is_admin() function with SECURITY DEFINER to avoid infinite recursion
CREATE POLICY "Admins can manage user profiles" 
  ON user_profiles 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
  ON user_profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

