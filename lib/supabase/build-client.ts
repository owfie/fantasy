import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for build-time operations (static generation)
 * This client doesn't require cookies and can be used in generateStaticParams
 */
export function createBuildClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

