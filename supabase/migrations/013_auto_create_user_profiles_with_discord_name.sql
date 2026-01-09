-- Auto-create user_profiles with Discord name from user_metadata
-- This trigger fires when a new user signs up via Discord (or any auth method)

-- ============================================
-- Function to handle new user creation
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
  v_email TEXT;
BEGIN
  -- Get email from the new user
  v_email := NEW.email;
  
  -- Extract display name from user_metadata (Discord provides full_name, name, or custom_claims.global_name)
  -- Priority: full_name > name > custom_claims.global_name > email
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->'custom_claims'->>'global_name',
    v_email
  );
  
  -- Insert or update user_profiles
  INSERT INTO public.user_profiles (id, email, display_name, is_admin)
  VALUES (NEW.id, v_email, v_display_name, FALSE)
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ============================================
-- Trigger on auth.users
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Update existing users to have Discord names
-- ============================================
-- This will update existing user_profiles with Discord names from auth.users
UPDATE public.user_profiles up
SET 
  display_name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->'custom_claims'->>'global_name',
    up.display_name,
    up.email
  ),
  updated_at = NOW()
FROM auth.users au
WHERE up.id = au.id
  AND (
    -- Only update if we can find a Discord name
    au.raw_user_meta_data->>'full_name' IS NOT NULL
    OR au.raw_user_meta_data->>'name' IS NOT NULL
    OR au.raw_user_meta_data->'custom_claims'->>'global_name' IS NOT NULL
  )
  -- Don't update if display_name is already set to something other than 'Admin' or email
  AND (up.display_name IS NULL OR up.display_name = 'Admin' OR up.display_name = up.email);

