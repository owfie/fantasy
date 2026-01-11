import type { Metadata } from 'next';
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: 'Protected | Adelaide Super League',
  description: 'Protected page for Adelaide Super League',
};

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1>Protected Page</h1>
      <p>Welcome, {user?.email}!</p>
      <p>This is a protected page that requires authentication.</p>
    </div>
  );
}
