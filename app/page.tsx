import { DiscordLogin } from "@/components/discord-login";
import { AuthButton } from "@/components/auth-button";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <main>
      <h1>Super League Fantasy</h1>
      <p>Welcome to the fantasy frisbee league application.</p>
      <AuthButton />
      {!user && <DiscordLogin />}
    </main>
  );
}
