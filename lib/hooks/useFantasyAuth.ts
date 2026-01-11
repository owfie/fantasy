/**
 * Hook to manage authentication state for fantasy team pages
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFantasyAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      setUser(authUser);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}

