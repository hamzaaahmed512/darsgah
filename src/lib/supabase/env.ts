type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

function readTrimmed(value: string | undefined) {
  return value ? value : null;
}

export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = readTrimmed(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const anonKey = readTrimmed(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv();

  if (!env) {
    throw new Error(
      "Missing Supabase environment variables. Create .env.local from .env.example or run `npm.cmd run setup:local`."
    );
  }

  return env;
}

export function requireSupabaseAdminEnv() {
  const publicEnv = requirePublicSupabaseEnv();
  const serviceRoleKey = readTrimmed(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (!serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Add SUPABASE_SERVICE_ROLE_KEY to .env.local."
    );
  }

  return {
    url: publicEnv.url,
    serviceRoleKey
  };
}
