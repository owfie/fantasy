import Link from "next/link";
import { AuthButton } from "./auth-button";

export function GlobalHeader() {
  return (
    <header className="border-b">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-semibold">
            Super League Fantasy
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/news" className="hover:underline">
              News
            </Link>
            <Link href="/fixtures" className="hover:underline">
              Fixtures
            </Link>
            <Link href="/players" className="hover:underline">
              Players
            </Link>
            <Link href="/fantasy" className="hover:underline">
              Fantasy
            </Link>
          </div>
        </div>
        <div>
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}

