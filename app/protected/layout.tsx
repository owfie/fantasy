import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main>
      <nav>
        <div>
          <Link href={"/"}>Super League Fantasy</Link>
        </div>
        {hasEnvVars && <AuthButton />}
      </nav>
      <div>
        {children}
      </div>
      <footer>
        <ThemeSwitcher />
      </footer>
    </main>
  );
}
