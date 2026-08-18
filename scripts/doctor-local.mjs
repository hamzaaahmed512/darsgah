import fs from "node:fs";

const path = ".env.local";
if (!fs.existsSync(path)) {
  console.error("Missing .env.local. Copy .env.example and add your Supabase credentials.");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1).trim()];
  })
);

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env.local.`);
    process.exit(1);
  }
}

const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
try {
  const response = await fetch(`${url.origin}/auth/v1/health`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  console.log(`Supabase Auth is reachable (${local ? "local stack" : "hosted project"}) at ${url.origin}.`);
  console.log("Environment check passed. Restart the dev server after every .env.local change.");
} catch (error) {
  console.error(`Cannot reach Supabase Auth at ${url.origin}: ${error instanceof Error ? error.message : error}`);
  if (local) console.error("Start Docker Desktop, then run `npm run setup:sh` before `npm run dev:sh`.");
  process.exit(1);
}
