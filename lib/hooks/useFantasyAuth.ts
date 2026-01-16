/**
 * Hook to manage authentication state for fantasy team pages
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFantasyAuth() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    async function loadUserAndProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      
      if (authUser) {
        // Fetch admin status from user_profiles
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', authUser.id)
          .single();
        
        setIsAdmin(profile?.is_admin ?? false);
      } else {
        setIsAdmin(false);
      }
      
      setIsLoading(false);
    }
    
    loadUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        // Re-fetch admin status on auth change
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', newUser.id)
          .single();
        
        setIsAdmin(profile?.is_admin ?? false);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, isLoading };
}

