import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const replacementPassword = process.env.TEST_USER_PASSWORD;

if (!supabaseUrl || !supabaseKey || !replacementPassword) {
  console.error("Missing Supabase configuration or TEST_USER_PASSWORD in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePasswords() {
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Error listing users.");
    return;
  }

  for (const u of users) {
    if (u.email.endsWith('@scholarly.test')) {
      console.log("Updating a test user password.");
      const { error } = await supabase.auth.admin.updateUserById(u.id, {
        password: replacementPassword,
        email_confirm: true
      });
      if (error) {
        console.error("Error updating a test user.");
      } else {
        console.log("Test user password updated.");
      }
    }
  }
}

updatePasswords();
