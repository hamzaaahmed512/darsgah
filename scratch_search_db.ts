import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf-8");
const getEnv = (key: string) => {
  const match = env.match(new RegExp(`${key}=(.*)`));
  return match ? match[1] : "";
};

const supabase = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

async function searchDB() {
  const tables = ["classes", "sections", "grades", "students", "academic_years"];
  for (const table of tables) {
    const { data } = await supabase.from(table).select("*");
    if (!data) continue;
    const matches = data.filter(row => JSON.stringify(row).includes("A.A"));
    if (matches.length > 0) {
      console.log(`Found A.A in table ${table}:`, matches);
    }
  }
  console.log("DB search complete");
}

searchDB().catch(console.error);
