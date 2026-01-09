"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function DiscordLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscordLogin = async () => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
        },
      });

      if (error) throw error;

      // The OAuth flow will redirect automatically, so we don't need to handle success here
      // The redirect will go to /auth/callback which will handle the session
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && <p style={{ color: "red", fontSize: "12px" }}>{error}</p>}
      <button
        onClick={handleDiscordLogin}
        disabled={isLoading}
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          backgroundColor: "#5865F2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? "..." : "Login"}
      </button>
    </div>
  );
}
