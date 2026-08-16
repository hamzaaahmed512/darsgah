type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  ].find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;

  const anonKey = [
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
  ].find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv();

  if (!env) {
    throw new Error(
      "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in Vercel or .env.local."
    );
  }

  return env;
}

export function requireSupabaseAdminEnv() {
  const publicEnv = requirePublicSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
    : null;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Add SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return {
    url: publicEnv.url,
    serviceRoleKey,
  };
}