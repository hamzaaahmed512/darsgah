import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run platform:grant -- owner@getdarsgah.com");
  process.exit(1);
}

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).trim()];
}));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let page = 1;
let user;
while (!user) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  user = data.users.find((item) => item.email?.toLowerCase() === email);
  if (user || data.users.length < 100) break;
  page += 1;
}
if (!user) {
  console.error(`No Supabase Auth user exists for ${email}. Create the user first, then run this command again.`);
  process.exit(1);
}
const fullName = String(user.user_metadata?.full_name ?? email.split("@")[0]);
const { error } = await admin.from("platform_admins").upsert({ user_id: user.id, email, full_name: fullName, status: "active" });
if (error) throw error;
console.log(`Platform access granted to ${email}.`);
