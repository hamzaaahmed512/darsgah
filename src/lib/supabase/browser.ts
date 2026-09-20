import { createBrowserClient } from "@supabase/ssr";
import { requirePublicSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey } = requirePublicSupabaseEnv();

  return createBrowserClient(url, anonKey, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" }
  });
}
