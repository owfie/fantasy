/**
 * Hook to manage authentication state for fantasy team pages
 * 
 * Uses direct REST API calls for profile fetching to avoid issues with
 * the Supabase JS client hanging during React Strict Mode remounts.
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFantasyAuth() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Get stable singleton client
  const supabase = createClient();

  useEffect(() => {
    isMountedRef.current = true;

    // Only use onAuthStateChange - it fires immediately with INITIAL_SESSION or SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (!isMountedRef.current) return;

      const newUser = session?.user ?? null;
      setUser(newUser);
      setIsLoading(false);
      
      if (newUser) {
        try {
          // Use direct REST API call instead of Supabase client to avoid hanging issues
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
          
          const response = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?id=eq.${newUser.id}&select=is_admin`,
            {
              headers: {
                'apikey': supabaseKey!,
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );
          
          const profiles = await response.json();
          const profile = profiles?.[0];
          
          if (isMountedRef.current) {
            setIsAdmin(profile?.is_admin ?? false);
          }
        } catch {
          if (isMountedRef.current) setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, isAdmin, isLoading };
}

