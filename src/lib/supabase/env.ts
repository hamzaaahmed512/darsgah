type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  // Access process.env directly without optional chaining so Next.js inlines the values
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
    : null;
    
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()
    : null;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv();

  if (!env) {
    throw new Error(
      "Missing Supabase environment variables. Please check your Vercel Environment Variables or .env.local file."
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