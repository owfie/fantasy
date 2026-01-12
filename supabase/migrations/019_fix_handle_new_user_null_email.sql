-- Fix handle_new_user trigger to handle NULL email from Discord OAuth
-- Discord may not provide email if:
-- - User has email privacy enabled
-- - Email is not verified in Discord
-- - Supabase didn't receive the email scope properly

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
  v_email TEXT;
BEGIN
  -- Get email from the new user, with fallbacks
  -- Priority: NEW.email > metadata email > generated placeholder
  v_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data->>'email',
    'user_' || NEW.id::TEXT || '@noemail.superleague.win'
  );

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
