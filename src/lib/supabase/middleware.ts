import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the Supabase auth cookie on the response and returns the user id.
 * Used by the proxy only for an optimistic gate; every server action/query still
 * re-checks auth and role itself.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ userId: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { userId: null };

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the JWT with the Auth server (getSession() does not).
  const { data } = await supabase.auth.getUser();
  return { userId: data.user?.id ?? null };
}
