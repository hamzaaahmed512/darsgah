import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAdminEnv } from "@/lib/supabase/env";

/**
 * Admin client with service_role key to bypass RLS and use Admin APIs.
 * MUST NEVER BE USED ON THE CLIENT.
 */
export function createAdminClient() {
  const { url, serviceRoleKey } = requireSupabaseAdminEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" })
    }
  });
}
