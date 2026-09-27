import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRemote() {
  const { data: schools, error: schoolsError } = await supabase.from("schools").select("*");
  console.log("Schools:", schools);
  if (schoolsError) console.error("Schools Error:", schoolsError.message);

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");
  console.log("Profiles count:", profiles?.length);

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  console.log("Auth users count:", users?.length);
  if (usersError) console.error("Users error:", usersError.message);
}

checkRemote();
