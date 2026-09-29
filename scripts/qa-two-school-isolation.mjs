// Read-only, authenticated PostgREST isolation probe.
// Supply QA_SUPABASE_URL, QA_SUPABASE_ANON_KEY, QA_SCHOOL_A_ID,
// QA_SCHOOL_B_ID, QA_SCHOOL_A_JWT, QA_SCHOOL_B_JWT as process environment
// variables. Never use a service-role key or publish the tokens.
import { createClient } from "@supabase/supabase-js";

const required = [
  "QA_SUPABASE_URL", "QA_SUPABASE_ANON_KEY", "QA_SCHOOL_A_ID",
  "QA_SCHOOL_B_ID", "QA_SCHOOL_A_JWT", "QA_SCHOOL_B_JWT"
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

const schoolA = process.env.QA_SCHOOL_A_ID;
const schoolB = process.env.QA_SCHOOL_B_ID;
if (schoolA === schoolB) throw new Error("Use two distinct schools.");

function claims(token) {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  if (payload.role !== "authenticated" || !payload.sub) {
    throw new Error("Both JWTs must belong to signed-in users, not a service role.");
  }
  if (payload.exp && payload.exp * 1000 <= Date.now()) throw new Error("An authentication token has expired.");
  return payload;
}
const claimsA = claims(process.env.QA_SCHOOL_A_JWT);
const claimsB = claims(process.env.QA_SCHOOL_B_JWT);
if (claimsA.sub === claimsB.sub) throw new Error("Use two different users.");

function client(token) {
  return createClient(process.env.QA_SUPABASE_URL, process.env.QA_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
const a = client(process.env.QA_SCHOOL_A_JWT);
const b = client(process.env.QA_SCHOOL_B_JWT);
const tables = ["exams", "marks", "fee_payments", "attendance_records", "enrollments"];
let failures = 0;

async function probe(table, ownClient, ownSchool, otherClient, otherSchool, label) {
  const own = await ownClient.from(table).select("id,school_id")
    .eq("school_id", ownSchool).order("id").limit(1);
  if (own.error) throw new Error(`${label} ${table} own-school query failed: ${own.error.message}`);
  if (!own.data?.length) {
    console.error(`FAIL ${label} ${table}: no visible own-school fixture; seed one or use an authorized reader`);
    failures += 1;
    return;
  }
  const row = own.data[0];
  if (row.school_id !== ownSchool) throw new Error(`${label} ${table} own-school mismatch`);

  const crossList = await otherClient.from(table).select("id,school_id")
    .eq("school_id", ownSchool).limit(10);
  const crossId = await otherClient.from(table).select("id,school_id")
    .eq("id", row.id).limit(1);
  const leaked = Boolean(crossList.data?.length || crossId.data?.length);
  if (crossList.error || crossId.error || leaked) {
    console.error(`FAIL ${otherSchool} -> ${ownSchool} ${table}: list=${crossList.data?.length ?? "error"}, direct=${crossId.data?.length ?? "error"}`);
    failures += 1;
  } else {
    console.log(`PASS ${otherSchool} -> ${ownSchool} ${table}: list=0 direct=0`);
  }
}

for (const table of tables) {
  await probe(table, a, schoolA, b, schoolB, "A");
  await probe(table, b, schoolB, a, schoolA, "B");
}
if (failures) {
  console.error(`${failures} isolation probe(s) failed or lacked fixtures.`);
  process.exitCode = 1;
} else {
  console.log("All ten authenticated cross-school probes passed.");
}
