import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import styles from './admin.module.scss';

export default async function AdminLayout({
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
  
  return (
    <div className={styles.adminLayout}>
      {children}
    </div>
  );
}
