import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import styles from './index.module.scss';

export async function AuthButton() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Discord provides avatar_url and full_name/name in user_metadata
  const metadata = user.user_metadata;
  const avatarUrl = metadata?.avatar_url;
  const username = metadata?.full_name || metadata?.name || metadata?.custom_claims?.global_name || user.email;

  return (
    <div className={styles.AuthButton}>
      <span>{username}</span>
      {avatarUrl && (
        <Image
          src={avatarUrl}
          alt={username || 'User avatar'}
          width={32}
          height={32}
          style={{ borderRadius: '50%' }}
        />
      )}

      {/* <LogoutButton /> */}
    </div>
  );
}
