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

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // 1. Mutate request cookies for downstream Server Components
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        // 2. Preserve existing response cookies while updating request context
        response = NextResponse.next({ request });

        // 3. Set all cookies on the new response instance
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // DO NOT place code between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isChangePasswordRoute = path === "/change-password";
  const isAuthRoute =
    path === "/sign-in" ||
    path === "/forgot-password" ||
    path === "/reset-password";

  // Case 1: Authenticated user visiting /sign-in -> Redirect to dashboard
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard"; // Adjust path if your home route is different
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Copy updated cookies to redirect response
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  }

  // Case 2: Must change password check
  if (user && !isChangePasswordRoute && !isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle<{ must_change_password: boolean }>();

    if (profile?.must_change_password) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/change-password";
      redirectUrl.search = "";

      const redirectResponse = NextResponse.redirect(redirectUrl);
      // Copy updated cookies to redirect response
      response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
      return redirectResponse;
    }
  }

  return response;
}