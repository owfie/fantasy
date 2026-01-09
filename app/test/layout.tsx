import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    notFound();
  }
  
  // Check if user is an admin
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile?.is_admin) {
    notFound();
  }
  
  return <>{children}</>;
}

