import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`));
  return match ? match[1] : "";
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: sections } = await supabase.from("sections").select("*");
  console.log("Sections with A.A:", sections?.filter(s => s.name.includes("A.A") || s.name === "A" || s.name === "A.A"));

  const { data: classes } = await supabase.from("classes").select("*");
  console.log("Classes with A.A:", classes?.filter(c => c.name.includes("A.A")));
}

run().catch(console.error);
