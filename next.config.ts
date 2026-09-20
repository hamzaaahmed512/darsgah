import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production") {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL",
    "PARENT_PORTAL_SESSION_SECRET", "AUTH_RATE_LIMIT_SECRET",
    "CONTACT_EMAIL_USER", "CONTACT_EMAIL_APP_PASSWORD", "CONTACT_EMAIL_TO"
  ];
  const missing = required.filter((name) => !process.env[name]?.trim() || /^(your-|replace-with-)/.test(process.env[name]!.trim()));
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_APP_URL"]) {
    let url: URL;
    try { url = new URL(process.env[name]!); }
    catch { throw new Error(`${name} must be a valid HTTPS URL in production.`); }
    if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS in production.`);
  }
  if (process.env.PARENT_PORTAL_SESSION_SECRET!.length < 32 || process.env.AUTH_RATE_LIMIT_SECRET!.length < 32) {
    throw new Error("Production signing and rate-limit secrets must be at least 32 characters.");
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("The public Supabase key must differ from the service role key.");
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" }
    ] }];
  }
};

export default nextConfig;
