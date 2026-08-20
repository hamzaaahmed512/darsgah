import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { requirePublicSupabaseEnv } from "@/lib/supabase/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = requirePublicSupabaseEnv();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  // Verifies/refreshes the JWT. With asymmetric signing keys this is local
  // after the JWKS is cached, unlike getUser(), which always calls Auth.
  // Password-change enforcement lives in the protected layout/requireUser,
  // where the already-needed profile data is available without a duplicate query.
  await supabase.auth.getClaims();

  return response;
}
