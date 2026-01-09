import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Only run proxy on routes that need session management:
     * - /auth/* (auth callback, error pages)
     * - /api/* (API routes that may need auth)
     */
    "/auth/:path*",
    "/api/:path*",
  ],
};

