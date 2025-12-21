import { createClient } from "@/lib/supabase/server";

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
