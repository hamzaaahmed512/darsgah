import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: sections } = await supabase.from("sections").select("*");
  console.log("Sections:", JSON.stringify(sections, null, 2));

  const { data: classes } = await supabase.from("classes").select("*");
  console.log("Classes:", JSON.stringify(classes, null, 2));
}

run().catch(console.error);
